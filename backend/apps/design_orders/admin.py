from django.contrib import admin

from .models import DesignCategory, DesignOrder, DesignOrderPayment, DesignOrderStatusHistory


@admin.register(DesignCategory)
class DesignCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name",)


class StatusHistoryInline(admin.TabularInline):
    model = DesignOrderStatusHistory
    extra = 0
    readonly_fields = ("from_status", "to_status", "changed_by", "note", "created_at")
    can_delete = False


class PaymentInline(admin.TabularInline):
    model = DesignOrderPayment
    extra = 0
    readonly_fields = ("amount", "recorded_by", "note", "created_at")
    can_delete = False


@admin.register(DesignOrder)
class DesignOrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_number",
        "design_name",
        "customer",
        "cut_quantity",
        "total_amount",
        "status",
        "expected_delivery_date",
    )
    list_filter = ("status", "design_category", "order_date")
    search_fields = ("order_number", "design_name", "customer__full_name")
    readonly_fields = (
        "order_number",
        "total_amount",
        "actual_delivery_date",
        "created_at",
        "updated_at",
    )
    inlines = [PaymentInline, StatusHistoryInline]
