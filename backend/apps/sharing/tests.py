import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from apps.sharing.models import SharedResponse
from apps.templates.models import Template
from apps.users.models import User


@pytest.fixture
def sender(db):
    return User.objects.create_user(email="sender@company.com")


@pytest.fixture
def recipient(db):
    return User.objects.create_user(email="recipient@company.com")


@pytest.fixture
def template(db):
    return Template.objects.create(
        name="Greeting", html="<p>Hi {{CUSTOMER_FIRST_NAME}}</p>", is_published=True,
    )


def auth_client(user):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {AccessToken.for_user(user)}")
    return client


def test_share_creates_snapshot(sender, recipient, template):
    resp = auth_client(sender).post(
        reverse("share-list"),
        {
            "recipient_email": recipient.email,
            "template": template.id,
            "resolved_text": "<p>Hi Ada</p>",
        },
        format="json",
    )
    assert resp.status_code == 201
    share = SharedResponse.objects.get()
    assert share.resolved_text == "<p>Hi Ada</p>"
    assert share.sender == sender
    assert share.recipient == recipient


def test_share_snapshot_immutable(sender, recipient, template):
    auth_client(sender).post(
        reverse("share-list"),
        {
            "recipient_email": recipient.email,
            "template": template.id,
            "resolved_text": "<p>Hi Ada</p>",
        },
        format="json",
    )
    share = SharedResponse.objects.get()

    # Editing the originating template must not affect the shared snapshot.
    template.html = "<p>Completely different {{CASE_NUMBER}}</p>"
    template.save()
    share.refresh_from_db()
    assert share.resolved_text == "<p>Hi Ada</p>"


def test_share_unknown_recipient(sender, template):
    resp = auth_client(sender).post(
        reverse("share-list"),
        {
            "recipient_email": "ghost@company.com",
            "template": template.id,
            "resolved_text": "<p>Hi</p>",
        },
        format="json",
    )
    assert resp.status_code == 400
    assert SharedResponse.objects.count() == 0


def test_share_stores_metadata(sender, recipient, template):
    resp = auth_client(sender).post(
        reverse("share-list"),
        {
            "recipient_email": recipient.email,
            "template": template.id,
            "resolved_text": "<p>Hi Ada</p>",
        },
        format="json",
    )
    assert resp.status_code == 201
    share = SharedResponse.objects.get()
    assert share.sender == sender
    assert share.recipient == recipient
    assert share.template == template
    assert share.created_at is not None
