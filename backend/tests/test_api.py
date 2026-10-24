"""Tests for Virtual Lab AI Mentor & Report FastAPI service."""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.schemas import MentorRequest, ReportRequest, SimulatorObservation


@pytest.fixture
def client():
    return TestClient(app)


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "groq_configured" in data
    assert "model" in data
    # Guarantee no secret leakage
    assert "api_key" not in data
    assert "key" not in data


def test_mentor_endpoint_offline_fallback(client, monkeypatch):
    # Ensure GROQ_API_KEY is not set or empty
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    
    payload = {
        "protocol_name": "mtt_reagent_prep",
        "display_title": "MTT: Reagent Preparation",
        "step_name": "prepare_falcon_tube",
        "step_prompt": "Retrieve sterile 15 mL conical tube.",
        "learning_goals": "Master sterile technique for MTT assay.",
        "question": "Why must the conical tube remain capped until use?",
        "completed_step_count": 1,
        "total_step_count": 5,
        "last_feedback": None,
    }
    response = client.post("/api/mentor", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "answer" in data
    assert len(data["answer"]) > 10
    assert data["mode"] == "offline_guidance"
    assert "prepare_falcon_tube" in data["progressive_hint"]


def test_mentor_validation_empty_question(client):
    payload = {
        "protocol_name": "sdspage_heat_denature_samples",
        "question": "",  # Invalid: min_length=1
    }
    response = client.post("/api/mentor", json=payload)
    assert response.status_code == 422


def test_mentor_validation_oversized_question(client):
    payload = {
        "protocol_name": "sdspage_heat_denature_samples",
        "question": "A" * 501,  # Invalid: max_length=500
    }
    response = client.post("/api/mentor", json=payload)
    assert response.status_code == 422


def test_report_endpoint_with_observations(client, monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    
    payload = {
        "protocol_name": "mtt_plate_reaction",
        "display_title": "MTT: Plate Reaction",
        "learning_objectives": "Execute MTT reagent incubation and observe crystal formation.",
        "completed_steps": ["add_mtt_reagent", "incubate_cells"],
        "incomplete_steps": ["aspirate_medium", "dissolve_crystals"],
        "observations": [
            {
                "step_name": "add_mtt_reagent",
                "target": "p200_micropipette",
                "action": "adjust",
                "recorded_value": "50",
                "unit": "uL",
                "timestamp": "2026-10-24T22:00:00Z"
            }
        ],
        "errors_encountered": ["Attempted to transfer reagent without tip."],
        "student_notes": "Incubation performed in 37C chamber."
    }
    response = client.post("/api/report", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["experiment_title"] == "MTT: Plate Reaction"
    assert len(data["recorded_observations"]) == 1
    assert data["recorded_observations"][0]["recorded_value"] == "50"
    assert len(data["errors_and_retries"]) == 1
    assert "disclaimer" in data
    assert "wet-lab" in data["disclaimer"].lower()
    assert len(data["unrecorded_limitations"]) > 0


def test_report_endpoint_no_observations(client, monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    
    payload = {
        "protocol_name": "trypan_blue_counting",
        "display_title": "Trypan Blue: Cell Counting",
        "completed_steps": [],
        "incomplete_steps": ["prepare_dilution", "load_hemocytometer"],
        "observations": [],
        "errors_encountered": []
    }
    response = client.post("/api/report", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["recorded_observations"] == []
    # Asserts that absent observations are NOT fabricated
    assert len(data["recorded_observations"]) == 0
    assert "AI-Assisted Draft" in data["disclaimer"]
