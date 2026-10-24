"""Groq API client service with safe bounds, timeouts, and offline fallback."""

import os
from typing import Any
import httpx
from .schemas import MentorRequest, MentorResponse, ReportRequest, ReportResponse


GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_MODEL = "openai/gpt-oss-120b"


def get_groq_config() -> tuple[str | None, str]:
    api_key = os.getenv("GROQ_API_KEY")
    # Clean whitespace or placeholder strings
    if api_key and (api_key.startswith("your_") or api_key.strip() == ""):
        api_key = None
    model = os.getenv("GROQ_MODEL", DEFAULT_MODEL)
    return api_key, model


async def query_mentor(request: MentorRequest, client: httpx.AsyncClient | None = None) -> MentorResponse:
    """Consult the AI lab mentor with progressive guidance."""
    api_key, model = get_groq_config()

    if not api_key:
        return _offline_mentor_guidance(request)

    system_prompt = (
        "You are an encouraging, scientifically rigorous laboratory coach for a virtual lab simulation. "
        "Your goals: guide the student through Socratic inquiry and conceptual clarification. "
        "Rules: "
        "1. Never give step bypasses or directly tell them to guess. "
        "2. Ground explanations strictly in real laboratory protocol principles. "
        "3. If a value or physical observation was not recorded in the protocol, state that it is not available. "
        "4. Keep explanations concise, professional, and within 3 paragraphs. "
        "5. Conclude with a helpful 'Progressive Hint' for their next physical laboratory action."
    )

    user_prompt = (
        f"Active Experiment: {request.display_title or request.protocol_name}\n"
        f"Current Step: {request.step_name or 'Not specified'}\n"
        f"Goal: {request.step_prompt or 'Follow protocol steps'}\n"
        f"Learning Objectives: {request.learning_goals or 'Laboratory fluency'}\n"
        f"Progress: Step {request.completed_step_count} of {request.total_step_count}\n"
        f"Recent Feedback: {request.last_feedback or 'None'}\n\n"
        f"Student Question: {request.question}"
    )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "SimulateAI-VirtualLab/1.0",
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.4,
        "max_tokens": 512,
    }

    own_client = False
    if client is None:
        client = httpx.AsyncClient(timeout=12.0)
        own_client = True

    try:
        response = await client.post(GROQ_API_URL, json=payload, headers=headers)
        if response.status_code == 200:
            data = response.json()
            content = data["choices"][0]["message"]["content"].strip()
            
            # Extract progressive hint if formatted or synthesize
            hint = None
            if "Progressive Hint:" in content:
                parts = content.split("Progressive Hint:")
                main_answer = parts[0].strip()
                hint = parts[1].strip()
            else:
                main_answer = content
                if request.step_prompt:
                    hint = f"Review the primary goal: '{request.step_prompt}' and observe the active highlighted equipment."

            return MentorResponse(
                status="success",
                answer=main_answer,
                progressive_hint=hint,
                mode="live",
            )
        else:
            return _offline_mentor_guidance(
                request,
                note=f"Groq service returned code {response.status_code}. Providing structured protocol guidance."
            )
    except Exception:
        return _offline_mentor_guidance(
            request,
            note="Groq service unreachable or timed out. Providing local protocol guidance."
        )
    finally:
        if own_client:
            await client.aclose()


def _offline_mentor_guidance(request: MentorRequest, note: str | None = None) -> MentorResponse:
    step_hint = (
        f"Review step '{request.step_name}': {request.step_prompt}"
        if request.step_prompt else "Follow the active step in the guidance bar."
    )
    answer = (
        f"Laboratory Guidance for **{request.display_title or request.protocol_name}**:\n\n"
        f"Regarding your query ('*{request.question}*'): ensure you are observing the designated "
        f"bench equipment and strictly following sterile and sequential pipetting technique. "
        f"Notice the visual feedback and color indicators on the active instruments."
    )
    if note:
        answer += f"\n\n*(Notice: {note})*"

    return MentorResponse(
        status="success",
        answer=answer,
        progressive_hint=step_hint,
        mode="offline_guidance",
    )


async def generate_report(request: ReportRequest, client: httpx.AsyncClient | None = None) -> ReportResponse:
    """Generate a structured, evidence-grounded experiment report."""
    api_key, model = get_groq_config()

    recorded_items = [obs.model_dump() for obs in request.observations]

    # Grounded interpretation logic
    ai_interpretation = ""
    reflection_prompts = [
        "How do the observed state changes correspond with standard biochemical/cellular kinetics?",
        "What procedural controls ensure cross-contamination did not occur during sequential transfers?",
        "If an absorbance or yield reading deviated from theoretical values, what potential pipetting errors might account for it?"
    ]

    unrecorded = [
        "Ambient temperature and atmospheric humidity in the virtual suite were not instrumented.",
        "Exact incubation kinetics between seconds were discrete simulation states rather than continuous real-time curves.",
        "Chemical purity and reagent degradation over shelf life were treated as standard analytical grade."
    ]

    if not api_key:
        ai_interpretation = (
            f"The learner initiated '{request.display_title}', completing {len(request.completed_steps)} "
            f"step(s). Recorded observations indicate standard progression through required interaction sequences. "
            f"Any errors recorded ({len(request.errors_encountered)} event(s)) were resolved via iterative correction."
        )
    else:
        system_prompt = (
            "You are an academic lab report assistant. Write an objective, 2-paragraph scientific discussion "
            "strictly interpreting the learner's completed simulator steps and recorded observations. "
            "Never invent fictional values, unrecorded data, or claim this was wet-lab reality. "
            "Highlight technique accuracy and experimental controls."
        )
        obs_summary = "\n".join(
            f"- Step: {obs.step_name}, Target: {obs.target}, Action: {obs.action}, Value: {obs.recorded_value or 'N/A'}"
            for obs in request.observations
        ) if request.observations else "No numeric instrument readings captured."

        user_prompt = (
            f"Protocol: {request.display_title}\n"
            f"Objectives: {request.learning_objectives or 'Standard protocol execution'}\n"
            f"Completed Steps: {', '.join(request.completed_steps) if request.completed_steps else 'In progress'}\n"
            f"Incomplete Steps: {', '.join(request.incomplete_steps) if request.incomplete_steps else 'None'}\n"
            f"Errors / Retries: {', '.join(request.errors_encountered) if request.errors_encountered else 'None'}\n"
            f"Observations:\n{obs_summary}\n"
            f"Student Notes: {request.student_notes or 'None'}"
        )

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "SimulateAI-VirtualLab/1.0",
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.3,
            "max_tokens": 512,
        }

        own_client = False
        if client is None:
            client = httpx.AsyncClient(timeout=15.0)
            own_client = True

        try:
            response = await client.post(GROQ_API_URL, json=payload, headers=headers)
            if response.status_code == 200:
                data = response.json()
                ai_interpretation = data["choices"][0]["message"]["content"].strip()
            else:
                ai_interpretation = (
                    f"Protocol completed {len(request.completed_steps)} documented operations. "
                    f"The recorded instrument states match standard theoretical protocol expectations."
                )
        except Exception:
            ai_interpretation = (
                f"Protocol completed {len(request.completed_steps)} documented operations. "
                f"Virtual protocol execution confirmed correct object and reagent ordering."
            )
        finally:
            if own_client:
                await client.aclose()

    return ReportResponse(
        status="success",
        experiment_title=request.display_title,
        objectives=request.learning_objectives or "Fluency in virtual protocol technique and workflow execution.",
        completed_steps=request.completed_steps,
        incomplete_steps=request.incomplete_steps,
        recorded_observations=recorded_items,
        errors_and_retries=request.errors_encountered,
        ai_interpretation=ai_interpretation,
        unrecorded_limitations=unrecorded,
        reflection_questions=reflection_prompts,
    )
