from django.contrib import admin

from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = (
        "customer_code",
        "full_name",
        "phone",
        "whatsapp_number",
        "whatsapp_consent",
        "is_active",
    )
    list_filter = ("is_active", "whatsapp_consent")
    search_fields = ("customer_code", "full_name", "phone", "whatsapp_number")
    readonly_fields = (
        "customer_code",
        "whatsapp_consent_at",
        "created_at",
        "updated_at",
    )
