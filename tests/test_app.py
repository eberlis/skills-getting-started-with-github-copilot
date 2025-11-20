import copy

from fastapi.testclient import TestClient
import pytest

from src import app as app_module


@pytest.fixture
def client_and_restore():
    # backup in-memory activities state and restore after test to keep isolation
    backup = copy.deepcopy(app_module.activities)
    client = TestClient(app_module.app)
    yield client
    app_module.activities.clear()
    app_module.activities.update(backup)


def test_get_activities(client_and_restore):
    client = client_and_restore
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_reflects_in_activities(client_and_restore):
    client = client_and_restore
    email = "test_student@example.com"
    # ensure email not present
    resp = client.get("/activities")
    assert email not in resp.json()["Chess Club"]["participants"]

    # sign up
    resp = client.post(f"/activities/Chess%20Club/signup?email={email}")
    assert resp.status_code == 200
    assert email in resp.json()["message"]

    # now the activities endpoint should include the new participant
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert email in data["Chess Club"]["participants"]


def test_double_signup_returns_400(client_and_restore):
    client = client_and_restore
    email = "duplicate@example.com"
    resp = client.post(f"/activities/Chess%20Club/signup?email={email}")
    assert resp.status_code == 200

    # second time should fail
    resp = client.post(f"/activities/Chess%20Club/signup?email={email}")
    assert resp.status_code == 400


def test_unregister_flow(client_and_restore):
    client = client_and_restore
    email = "remove_me@example.com"

    # signup then unregister
    resp = client.post(f"/activities/Chess%20Club/signup?email={email}")
    assert resp.status_code == 200

    resp = client.post(f"/activities/Chess%20Club/unregister?email={email}")
    assert resp.status_code == 200
    assert "Unregistered" in resp.json()["message"]

    # trying to unregister again should return 400
    resp = client.post(f"/activities/Chess%20Club/unregister?email={email}")
    assert resp.status_code == 400
