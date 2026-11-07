"""
OCR and document parsing utilities used by the 'ocr' and 'parsing' LangGraph nodes.
Supports PDF (text-layer extraction + OCR fallback for scanned pages), plain text,
and image files.
"""
import io
import logging

from pypdf import PdfReader
from PIL import Image
import pytesseract
from pdf2image import convert_from_bytes

logger = logging.getLogger("aivoa.ocr")


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Try native PDF text extraction first; fall back to OCR per page for scanned PDFs."""
    text_chunks = []
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        for page in reader.pages:
            page_text = page.extract_text() or ""
            text_chunks.append(page_text)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Native PDF text extraction failed: %s", exc)

    combined = "\n".join(text_chunks).strip()
    if len(combined) >= 20:
        return combined

    # Fall back to OCR: rasterize pages and run tesseract
    logger.info("PDF has no extractable text layer, falling back to OCR")
    try:
        images = convert_from_bytes(file_bytes)
        ocr_text = []
        for image in images:
            ocr_text.append(pytesseract.image_to_string(image))
        return "\n".join(ocr_text).strip()
    except Exception as exc:  # noqa: BLE001
        logger.error("OCR fallback failed: %s", exc)
        return combined


def extract_text_from_image(file_bytes: bytes) -> str:
    image = Image.open(io.BytesIO(file_bytes))
    return pytesseract.image_to_string(image)


def extract_text_from_upload(filename: str, content_type: str, file_bytes: bytes) -> str:
    lower_name = filename.lower()
    if content_type == "application/pdf" or lower_name.endswith(".pdf"):
        return extract_text_from_pdf(file_bytes)
    if content_type.startswith("image/") or lower_name.endswith((".png", ".jpg", ".jpeg")):
        return extract_text_from_image(file_bytes)
    if content_type in ("text/plain",) or lower_name.endswith(".txt"):
        return file_bytes.decode("utf-8", errors="ignore")
    if lower_name.endswith(".docx"):
        # Lightweight DOCX text extraction without extra heavy deps beyond pypdf/PIL:
        # DOCX is a zip of XML; extract the document.xml text nodes.
        import zipfile
        import re

        with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
            xml_content = z.read("word/document.xml").decode("utf-8", errors="ignore")
        text = re.sub(r"<[^>]+>", " ", xml_content)
        return text
    # Unknown type: best-effort decode
    return file_bytes.decode("utf-8", errors="ignore")
