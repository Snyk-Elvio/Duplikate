import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def is_published_to_visibility(apps, schema_editor):
    Template = apps.get_model("templates", "Template")
    Template.objects.filter(is_published=False).update(visibility="personal")
    # is_published=True rows already have visibility="global" from the default


class Migration(migrations.Migration):

    dependencies = [
        ("templates", "0002_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="template",
            name="visibility",
            field=models.CharField(
                choices=[("personal", "Personal"), ("shared", "Shared"), ("global", "Global")],
                default="global",
                max_length=10,
            ),
        ),
        migrations.RunPython(is_published_to_visibility, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="template",
            name="is_published",
        ),
        migrations.CreateModel(
            name="TemplateShare",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("shared_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="templates_shared_by_me", to=settings.AUTH_USER_MODEL)),
                ("shared_with", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="template_shares", to=settings.AUTH_USER_MODEL)),
                ("template", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="visibility_shares", to="templates.template")),
            ],
            options={
                "unique_together": {("template", "shared_with")},
            },
        ),
    ]
