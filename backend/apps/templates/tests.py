import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from apps.templates.models import Template
from apps.users.models import User


@pytest.fixture
def manager(db):
    return User.objects.create_user(email="mgr@company.com", is_manager=True)


@pytest.fixture
def engineer(db):
    return User.objects.create_user(email="eng@company.com", is_manager=False)


def auth_client(user):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {AccessToken.for_user(user)}")
    return client


@pytest.fixture
def published(db, manager):
    return Template.objects.create(
        name="Welcome", html="<p>Hi {{CUSTOMER_FIRST_NAME}}</p>",
        is_published=True, created_by=manager,
    )


@pytest.fixture
def draft(db, manager):
    return Template.objects.create(
        name="Draft", html="<p>WIP</p>", is_published=False, created_by=manager,
    )


def test_engineer_sees_published_only(engineer, published, draft):
    resp = auth_client(engineer).get(reverse("template-list"))
    assert resp.status_code == 200
    names = {t["name"] for t in resp.data}
    assert names == {"Welcome"}


def test_manager_sees_all(manager, published, draft):
    resp = auth_client(manager).get(reverse("template-list"))
    assert resp.status_code == 200
    names = {t["name"] for t in resp.data}
    assert names == {"Welcome", "Draft"}


def test_engineer_cannot_create(engineer):
    resp = auth_client(engineer).post(
        reverse("template-list"),
        {"name": "Nope", "html": "<p>x</p>", "is_published": True},
        format="json",
    )
    assert resp.status_code == 403
    assert Template.objects.count() == 0


def test_manager_can_create(manager):
    resp = auth_client(manager).post(
        reverse("template-list"),
        {"name": "Yes", "html": "<p>{{CASE_NUMBER}}</p>", "is_published": True},
        format="json",
    )
    assert resp.status_code == 201
    assert Template.objects.count() == 1
    assert Template.objects.get().created_by == manager
