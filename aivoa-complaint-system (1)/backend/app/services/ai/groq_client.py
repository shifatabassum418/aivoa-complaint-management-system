import json
import logging
from typing import Optional

from groq import Groq, APIStatusError, APIConnectionError

from app.core.config import settings

logger = logging.getLogger("aivoa.groq")

_client: Optional[Groq] = None


def get_client() -> Groq:
    global _client
    if _client is None:
        if not settings.GROQ_API_KEY:
            raise RuntimeError(
                "GROQ_API_KEY is not set. Add it to your .env file before using AI features."
            )
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


def call_groq(system_prompt: str, user_prompt: str, json_mode: bool = True, temperature: float = 0.2) -> str:
    """
    Calls Groq chat completion with the primary model (gemma2-9b-it) and
    automatically falls back to llama-3.3-70b-versatile if the primary
    model errors out, is decommissioned, or rate-limited.
    Returns the raw text content of the model's reply.
    """
    client = get_client()
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    models_to_try = [settings.GROQ_PRIMARY_MODEL, settings.GROQ_FALLBACK_MODEL]
    last_error = None

    for model in models_to_try:
        try:
            kwargs = dict(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=2048,
            )
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}

            completion = client.chat.completions.create(**kwargs)
            content = completion.choices[0].message.content
            logger.info("Groq call succeeded using model=%s", model)
            return content
        except (APIStatusError, APIConnectionError) as exc:
            logger.warning("Groq model %s failed (%s). Trying fallback if available.", model, exc)
            last_error = exc
            continue
        except Exception as exc:  # noqa: BLE001 - genuinely need to catch and fallback
            logger.warning("Groq model %s raised unexpected error: %s", model, exc)
            last_error = exc
            continue

    raise RuntimeError(f"All Groq models failed. Last error: {last_error}")


def call_groq_json(system_prompt: str, user_prompt: str, temperature: float = 0.2) -> dict:
    """Calls Groq expecting a JSON object response and parses it safely."""
    raw = call_groq(system_prompt, user_prompt, json_mode=True, temperature=temperature)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Strip markdown fences if the model added them despite instructions
        cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return json.loads(cleaned)
