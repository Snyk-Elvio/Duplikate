from datetime import timedelta

import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from apps.users.models import User


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def engineer(db):
    return User.objects.create_user(email="eng@company.com", is_manager=False)


def test_login_known_email(client, engineer):
    resp = client.post(reverse("login"), {"email": "eng@company.com"}, format="json")
    assert resp.status_code == 200
    assert resp.data["token"]
    assert resp.data["user"]["email"] == "eng@company.com"
    assert resp.data["user"]["is_manager"] is False


def test_login_unknown_email(client, db):
    resp = client.post(reverse("login"), {"email": "nobody@company.com"}, format="json")
    assert resp.status_code == 401


def test_login_malformed_email(client, db):
    resp = client.post(reverse("login"), {"email": "not-an-email"}, format="json")
    assert resp.status_code == 400


def test_login_updates_last_seen(client, engineer):
    assert engineer.last_seen is None
    client.post(reverse("login"), {"email": "eng@company.com"}, format="json")
    engineer.refresh_from_db()
    assert engineer.last_seen is not None


def test_expired_token_rejected(client, engineer):
    # Mint an access token that expired an hour ago.
    token = AccessToken.for_user(engineer)
    token.set_exp(from_time=token.current_time - timedelta(days=8))
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    # Any authenticated endpoint will do; templates list requires auth.
    resp = client.get(reverse("template-list"))
    assert resp.status_code == 401
