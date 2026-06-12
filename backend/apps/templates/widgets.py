from django import forms
from django.utils.html import escape
from django.utils.safestring import mark_safe


class QuillWidget(forms.Textarea):
    """
    Replaces the default <textarea> for the html field with a Quill rich-text
    editor. The textarea is kept hidden and stays in sync with Quill so the
    standard Django form machinery reads and saves the HTML unchanged.

    Toolbar: bold · italic · underline | inline-code | ol · ul | link | clear
    """

    def render(self, name, value, attrs=None, renderer=None):
        # Build the hidden textarea that Django's form machinery reads.
        final_attrs = self.build_attrs(self.attrs, attrs or {})
        final_attrs["style"] = "display:none"
        final_attrs["name"] = name
        textarea_id = final_attrs.get("id", f"id_{name}")
        final_attrs["id"] = textarea_id

        attrs_html = " ".join(
            f'{k}="{escape(str(v))}"' for k, v in final_attrs.items()
        )
        textarea_html = f"<textarea {attrs_html}>{escape(value or '')}</textarea>"

        editor_html = (
            f'<div class="quill-widget-root" data-field-id="{textarea_id}"'
            f' style="height:400px; background:#fff;"></div>'
        )

        return mark_safe(f'<div class="quill-widget-wrapper">{editor_html}{textarea_html}</div>')

    class Media:
        css = {
            "all": (
                "https://cdn.quilljs.com/1.3.7/quill.snow.css",
            )
        }
        js = (
            "https://cdn.quilljs.com/1.3.7/quill.min.js",
            "templates/js/quill_widget.js",
        )
