from datetime import date, timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db.models import Sum
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.generics import ListAPIView
from rest_framework.response import Response

from apps.accounts.authorization import Capability
from apps.accounts.permissions import HasRequiredCapability
from apps.design_orders.models import DesignOrder, DesignOrderPayment, DesignOrderStatus

from . import services
from .dashboard import DashboardFilterSerializer, build_dashboard
from .models import (
    CashReconciliation,
    DailyClosing,
    Expense,
    JournalActivity,
    LoanStatus,
    MoneyLoan,
    PayableAccount,
    PayableOrigin,
    PayableRepayment,
)
from .serializers import (
    CashReconciliationSerializer,
    DailyClosingSerializer,
    ExpenseSerializer,
    JournalActivitySerializer,
    MoneyLoanSerializer,
    PayableAccountSerializer,
    RepaymentHistorySerializer,
    RepaymentSerializer,
    VoidReasonSerializer,
)


def activity_values(values):
    return {key: str(value) for key, value in values.items()}


def period_bounds(request):
    today = timezone.localdate()
    selected = request.query_params.get("date") or request.data.get("date")
    return date.fromisoformat(selected or str(today))


class CashReconciliationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CashReconciliationSerializer
    permission_classes = [HasRequiredCapability]
    required_capability = Capability.MANAGE_EXPENSES

    def get_queryset(self):
        queryset = CashReconciliation.objects.select_related("created_by")
        if selected_date := self.request.query_params.get("date"):
            queryset = queryset.filter(reconciliation_date=selected_date)
        return queryset

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        selected_date = serializer.validated_data["reconciliation_date"]
        system_balance = services.calculate_daily_finances(selected_date)["closing_balance"]
        actual_balance = serializer.validated_data["actual_balance"]
        reconciliation = serializer.save(
            system_balance=system_balance,
            difference=actual_balance - system_balance,
            created_by=request.user,
        )
        JournalActivity.objects.create(
            entity_type="cash_reconciliation",
            entity_id=reconciliation.id,
            action="created",
            changed_fields={
                "date": str(selected_date),
                "system_balance": str(system_balance),
                "actual_balance": str(actual_balance),
                "difference": str(reconciliation.difference),
                "reason": reconciliation.reason,
            },
            actor=request.user,
        )
        return Response({"data": self.get_serializer(reconciliation).data}, status=201)

    @action(detail=True, methods=["post"])
    def void(self, request, pk=None):
        reason = VoidReasonSerializer(data=request.data)
        reason.is_valid(raise_exception=True)
        reconciliation = self.get_object()
        values = {
            "difference": str(reconciliation.difference),
            "reason": reason.validated_data["reason"],
        }
        entity_id = reconciliation.id
        reconciliation.delete()
        JournalActivity.objects.create(
            entity_type="cash_reconciliation",
            entity_id=entity_id,
            action="voided",
            changed_fields=values,
            actor=request.user,
        )
        return Response(status=204)


class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [HasRequiredCapability]
    required_capability = Capability.MANAGE_EXPENSES
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        queryset = Expense.objects.select_related("created_by", "updated_by")
        if expense_date := self.request.query_params.get("date"):
            queryset = queryset.filter(expense_date=expense_date)
        return queryset

    def perform_create(self, serializer):
        expense = serializer.save(created_by=self.request.user, updated_by=self.request.user)
        JournalActivity.objects.create(
            entity_type="expense",
            entity_id=expense.id,
            action="created",
            changed_fields=activity_values(serializer.validated_data),
            actor=self.request.user,
        )

    def perform_update(self, serializer):
        expense = serializer.save(updated_by=self.request.user)
        JournalActivity.objects.create(
            entity_type="expense",
            entity_id=expense.id,
            action="updated",
            changed_fields=activity_values(serializer.validated_data),
            actor=self.request.user,
        )

    @action(detail=True, methods=["post"])
    def void(self, request, pk=None):
        reason = VoidReasonSerializer(data=request.data)
        reason.is_valid(raise_exception=True)
        expense = self.get_object()
        values = {"amount": str(expense.amount), "reason": reason.validated_data["reason"]}
        entity_id = expense.id
        expense.delete()
        JournalActivity.objects.create(
            entity_type="expense",
            entity_id=entity_id,
            action="voided",
            changed_fields=values,
            actor=request.user,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class MoneyLoanViewSet(viewsets.ModelViewSet):
    serializer_class = MoneyLoanSerializer
    permission_classes = [HasRequiredCapability]
    required_capability = Capability.MANAGE_EXPENSES
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        queryset = MoneyLoan.objects.select_related("created_by", "updated_by")
        if loan_date := self.request.query_params.get("date"):
            queryset = queryset.filter(loan_date=loan_date)
        return queryset

    @action(detail=True, methods=["get", "post"], url_path="repayments")
    def repayments(self, request, pk=None):
        loan = self.get_object()
        if request.method == "GET":
            return Response(
                {
                    "data": RepaymentHistorySerializer(
                        loan.repayments.select_related("created_by"), many=True
                    ).data
                }
            )
        serializer = RepaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            loan, repayment = services.record_loan_repayment(
                loan=loan, data=serializer.validated_data, created_by=request.user
            )
        except ValidationError as exc:
            raise serializers.ValidationError(exc.message_dict) from exc
        return Response(
            {
                "data": MoneyLoanSerializer(loan).data,
                "repayment": RepaymentHistorySerializer(repayment).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path=r"repayments/(?P<repayment_id>[^/.]+)/void")
    def void_repayment(self, request, pk=None, repayment_id=None):
        reason = VoidReasonSerializer(data=request.data)
        reason.is_valid(raise_exception=True)
        loan = self.get_object()
        repayment = loan.repayments.filter(pk=repayment_id).first()
        if repayment is None:
            from rest_framework.exceptions import NotFound

            raise NotFound("Repayment not found.")
        values = {"amount": str(repayment.amount), "reason": reason.validated_data["reason"]}
        entity_id = repayment.id
        repayment.delete()
        self._sync_status(loan)
        JournalActivity.objects.create(
            entity_type="loan_repayment",
            entity_id=entity_id,
            action="voided",
            changed_fields=values,
            actor=request.user,
        )
        return Response({"data": MoneyLoanSerializer(loan).data})

    @action(detail=True, methods=["post"])
    def void(self, request, pk=None):
        reason = VoidReasonSerializer(data=request.data)
        reason.is_valid(raise_exception=True)
        loan = self.get_object()
        if loan.repayments.exists():
            raise serializers.ValidationError({"loan": "لومړی د پور ټولې بېرته ورکړې لغوه کړئ."})
        values = {"amount": str(loan.amount), "reason": reason.validated_data["reason"]}
        entity_id = loan.id
        loan.delete()
        JournalActivity.objects.create(
            entity_type="loan",
            entity_id=entity_id,
            action="voided",
            changed_fields=values,
            actor=request.user,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    def perform_create(self, serializer):
        loan = serializer.save(created_by=self.request.user, updated_by=self.request.user)
        initial_returned = loan.returned_amount
        if initial_returned:
            loan.returned_amount = 0
            loan.save(update_fields=["returned_amount", "updated_at"])
            services.record_loan_repayment(
                loan=loan,
                data={
                    "amount": initial_returned,
                    "payment_date": loan.loan_date,
                    "payment_method": "CASH",
                    "note": "Initial repayment",
                },
                created_by=self.request.user,
            )
        self._sync_status(loan)
        JournalActivity.objects.create(
            entity_type="loan",
            entity_id=loan.id,
            action="created",
            changed_fields=activity_values(serializer.validated_data),
            actor=self.request.user,
        )

    def perform_update(self, serializer):
        loan = serializer.save(updated_by=self.request.user)
        self._sync_status(loan)
        JournalActivity.objects.create(
            entity_type="loan",
            entity_id=loan.id,
            action="updated",
            changed_fields=activity_values(serializer.validated_data),
            actor=self.request.user,
        )

    @staticmethod
    def _sync_status(loan):
        returned = loan.total_returned
        if returned >= loan.amount:
            loan.status = LoanStatus.RETURNED
        elif returned > 0:
            loan.status = LoanStatus.PARTIALLY_RETURNED
        else:
            loan.status = LoanStatus.OPEN
        loan.save(update_fields=["status", "updated_at"])


class PayableAccountViewSet(viewsets.ModelViewSet):
    serializer_class = PayableAccountSerializer
    permission_classes = [HasRequiredCapability]
    required_capability = Capability.MANAGE_EXPENSES
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        queryset = PayableAccount.objects.select_related("created_by", "updated_by")
        if payable_date := self.request.query_params.get("date"):
            queryset = queryset.filter(payable_date=payable_date)
        return queryset

    @action(detail=True, methods=["get", "post"], url_path="repayments")
    def repayments(self, request, pk=None):
        payable = self.get_object()
        if request.method == "GET":
            return Response(
                {
                    "data": RepaymentHistorySerializer(
                        payable.repayments.select_related("created_by"), many=True
                    ).data
                }
            )
        serializer = RepaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payable, repayment = services.record_payable_repayment(
                payable=payable, data=serializer.validated_data, created_by=request.user
            )
        except ValidationError as exc:
            raise serializers.ValidationError(exc.message_dict) from exc
        return Response(
            {
                "data": PayableAccountSerializer(payable).data,
                "repayment": RepaymentHistorySerializer(repayment).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path=r"repayments/(?P<repayment_id>[^/.]+)/void")
    def void_repayment(self, request, pk=None, repayment_id=None):
        reason = VoidReasonSerializer(data=request.data)
        reason.is_valid(raise_exception=True)
        payable = self.get_object()
        repayment = payable.repayments.filter(pk=repayment_id).first()
        if repayment is None:
            from rest_framework.exceptions import NotFound

            raise NotFound("Repayment not found.")
        values = {"amount": str(repayment.amount), "reason": reason.validated_data["reason"]}
        entity_id = repayment.id
        repayment.delete()
        JournalActivity.objects.create(
            entity_type="payable_repayment",
            entity_id=entity_id,
            action="voided",
            changed_fields=values,
            actor=request.user,
        )
        return Response({"data": PayableAccountSerializer(payable).data})

    @action(detail=True, methods=["post"])
    def void(self, request, pk=None):
        reason = VoidReasonSerializer(data=request.data)
        reason.is_valid(raise_exception=True)
        payable = self.get_object()
        if payable.repayments.exists():
            raise serializers.ValidationError({"payable": "لومړی ټولې ثبت شوې ورکړې لغوه کړئ."})
        values = {"amount": str(payable.amount), "reason": reason.validated_data["reason"]}
        entity_id = payable.id
        payable.delete()
        JournalActivity.objects.create(
            entity_type="payable",
            entity_id=entity_id,
            action="voided",
            changed_fields=values,
            actor=request.user,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    def perform_create(self, serializer):
        payable = serializer.save(created_by=self.request.user, updated_by=self.request.user)
        initial_paid = payable.paid_amount
        if initial_paid:
            payable.paid_amount = 0
            payable.save(update_fields=["paid_amount", "updated_at"])
            services.record_payable_repayment(
                payable=payable,
                data={
                    "amount": initial_paid,
                    "payment_date": payable.payable_date,
                    "payment_method": "CASH",
                    "note": "Initial payment",
                },
                created_by=self.request.user,
            )
        JournalActivity.objects.create(
            entity_type="payable",
            entity_id=payable.id,
            action="created",
            changed_fields=activity_values(serializer.validated_data),
            actor=self.request.user,
        )

    def perform_update(self, serializer):
        payable = serializer.save(updated_by=self.request.user)
        JournalActivity.objects.create(
            entity_type="payable",
            entity_id=payable.id,
            action="updated",
            changed_fields=activity_values(serializer.validated_data),
            actor=self.request.user,
        )


class DailyClosingListView(ListAPIView):
    serializer_class = DailyClosingSerializer
    permission_classes = [HasRequiredCapability]
    required_capability = Capability.MANAGE_EXPENSES
    queryset = DailyClosing.objects.select_related("closed_by")


@extend_schema(responses=OpenApiTypes.OBJECT)
@api_view(["GET"])
@permission_classes([HasRequiredCapability])
def journal_summary(request):
    if not request.user.is_authenticated:
        return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
    selected_date = period_bounds(request)
    finances = services.calculate_daily_finances(selected_date)
    transactions = services.build_transactions(selected_date, selected_date)
    income = DesignOrderPayment.objects.filter(payment_date=selected_date).aggregate(
        total=Sum("amount")
    )["total"] or Decimal("0")
    expenses = Expense.objects.filter(expense_date=selected_date).aggregate(total=Sum("amount"))[
        "total"
    ] or Decimal("0")
    payable_income = PayableAccount.objects.filter(
        payable_date=selected_date, origin=PayableOrigin.CASH_LOAN
    ).aggregate(total=Sum("amount"))["total"] or Decimal("0")
    payable_returns = PayableRepayment.objects.filter(payment_date=selected_date).aggregate(
        total=Sum("amount")
    )["total"] or Decimal("0")
    payable_accounts = PayableAccount.objects.filter(
        payable_date__lte=selected_date
    ).prefetch_related("repayments")
    payables = sum(
        (
            payable.amount
            - sum(
                (
                    repayment.amount
                    for repayment in payable.repayments.all()
                    if repayment.payment_date <= selected_date
                ),
                Decimal("0.00"),
            )
            for payable in payable_accounts
        ),
        Decimal("0.00"),
    )
    orders = (
        DesignOrder.objects.filter(order_date__lte=selected_date)
        .exclude(status=DesignOrderStatus.CANCELLED)
        .prefetch_related("payment_history")
    )
    customer_debts = sum(
        (
            order.total_amount
            - sum(
                (
                    payment.amount
                    for payment in order.payment_history.all()
                    if payment.payment_date <= selected_date
                ),
                Decimal("0.00"),
            )
            for order in orders
        ),
        Decimal("0.00"),
    )
    loans_snapshot = MoneyLoan.objects.filter(loan_date__lte=selected_date).prefetch_related(
        "repayments"
    )
    money_loan_receivables = sum(
        (
            loan.amount
            - sum(
                (
                    repayment.amount
                    for repayment in loan.repayments.all()
                    if repayment.payment_date <= selected_date
                ),
                Decimal("0.00"),
            )
            for loan in loans_snapshot
        ),
        Decimal("0.00"),
    )
    receivables = customer_debts + money_loan_receivables
    return Response(
        {
            "data": {
                "date": selected_date,
                "income": income,
                "expenses": expenses,
                "customer_debts": customer_debts,
                "money_loan_receivables": money_loan_receivables,
                "loans_given": finances["loan_given"],
                "loan_returns": finances["loan_returns"],
                "payable_income": payable_income,
                "money_received": finances["money_received"],
                "payable_returns": payable_returns,
                "total_receivables": receivables,
                "total_payables": payables,
                "net_financial_position": receivables - payables,
                "cash_balance": finances["closing_balance"],
                "net_profit": finances["net_profit"],
                "opening_balance": finances["opening_balance"],
                "customer_payments": finances["customer_payments"],
                "other_income": finances["other_income"],
                "cash_adjustments": finances["cash_adjustments"],
                "loan_given": finances["loan_given"],
                "payable_payments": finances["payable_payments"],
                "closing_balance": finances["closing_balance"],
                "sales": finances["sales"],
                "transactions": transactions,
            }
        }
    )


@extend_schema(parameters=[DashboardFilterSerializer], responses=OpenApiTypes.OBJECT)
@api_view(["GET"])
@permission_classes([HasRequiredCapability])
def dashboard(request):
    filters = DashboardFilterSerializer(data=request.query_params)
    filters.is_valid(raise_exception=True)
    values = filters.validated_data
    return Response(
        {
            "data": build_dashboard(
                start=values["start_date"], end=values["end_date"], period=values["period"]
            )
        }
    )


@extend_schema(request=OpenApiTypes.OBJECT, responses=OpenApiTypes.OBJECT)
@api_view(["POST"])
@permission_classes([HasRequiredCapability])
def close_day(request):
    selected_date = period_bounds(request)
    finances = services.calculate_daily_finances(selected_date)
    income = DesignOrderPayment.objects.filter(payment_date=selected_date).aggregate(
        total=Sum("amount")
    )["total"] or Decimal("0")
    expenses = Expense.objects.filter(expense_date=selected_date).aggregate(total=Sum("amount"))[
        "total"
    ] or Decimal("0")
    closing, _ = DailyClosing.objects.update_or_create(
        closing_date=selected_date,
        defaults={
            "opening_balance": finances["opening_balance"],
            "customer_payments": finances["customer_payments"],
            "other_income": finances["other_income"],
            "money_received": finances["money_received"],
            "loan_returns": finances["loan_returns"],
            "loan_given": finances["loan_given"],
            "payable_payments": finances["payable_payments"],
            "closing_balance": finances["closing_balance"],
            "total_income": finances["total_income"],
            "total_expenses": finances["total_expenses"],
            "net_profit": finances["net_profit"],
            "closed_by": request.user,
        },
    )
    JournalActivity.objects.create(
        entity_type="daily_closing",
        entity_id=closing.id,
        action="closed",
        changed_fields={
            "closing_date": str(selected_date),
            "total_income": str(income),
            "total_expenses": str(expenses),
        },
        actor=request.user,
    )
    return Response({"data": DailyClosingSerializer(closing).data}, status=status.HTTP_201_CREATED)


@extend_schema(responses=OpenApiTypes.OBJECT)
@api_view(["GET"])
@permission_classes([HasRequiredCapability])
def journal_report(request):
    selected = period_bounds(request)
    period = request.query_params.get("period", "daily")
    if period == "weekly":
        start = selected - timedelta(days=selected.weekday())
        end = selected
    elif period == "monthly":
        start = selected.replace(day=1)
        end = selected
    elif period == "yearly":
        start = selected.replace(month=1, day=1)
        end = selected
    else:
        start = end = selected
    finances = services.calculate_cash_finances(start, end)
    transactions = services.build_transactions(start, end)
    income = DesignOrderPayment.objects.filter(payment_date__range=(start, end)).aggregate(
        total=Sum("amount")
    )["total"] or Decimal("0")
    expenses = Expense.objects.filter(expense_date__range=(start, end)).aggregate(
        total=Sum("amount")
    )["total"] or Decimal("0")
    loans = MoneyLoan.objects.filter(loan_date__range=(start, end)).aggregate(total=Sum("amount"))[
        "total"
    ] or Decimal("0")
    payable_income = PayableAccount.objects.filter(
        payable_date__range=(start, end), origin=PayableOrigin.CASH_LOAN
    ).aggregate(total=Sum("amount"))["total"] or Decimal("0")
    payable_returns = PayableRepayment.objects.filter(payment_date__range=(start, end)).aggregate(
        total=Sum("amount")
    )["total"] or Decimal("0")
    return Response(
        {
            "data": {
                "period": period,
                "start_date": start,
                "end_date": end,
                "income": income,
                "expenses": expenses,
                "loans_given": loans,
                "loan_returns": finances["loan_returns"],
                "payable_income": payable_income,
                "payable_returns": payable_returns,
                "net_profit": finances["net_profit"],
                "cash_balance": finances["closing_balance"],
                "opening_balance": finances["opening_balance"],
                "customer_payments": finances["customer_payments"],
                "other_income": finances["other_income"],
                "cash_adjustments": finances["cash_adjustments"],
                "loan_given": finances["loan_given"],
                "payable_payments": finances["payable_payments"],
                "closing_balance": finances["closing_balance"],
                "sales": finances["sales"],
                "transactions": transactions,
            }
        }
    )


class JournalActivityListView(ListAPIView):
    serializer_class = JournalActivitySerializer
    permission_classes = [HasRequiredCapability]
    required_capability = Capability.MANAGE_EXPENSES
    queryset = JournalActivity.objects.select_related("actor")


journal_summary.permission_classes = [HasRequiredCapability]
journal_summary.cls.required_capability = Capability.MANAGE_EXPENSES
journal_report.permission_classes = [HasRequiredCapability]
journal_report.cls.required_capability = Capability.MANAGE_EXPENSES
close_day.permission_classes = [HasRequiredCapability]
close_day.cls.required_capability = Capability.MANAGE_EXPENSES
dashboard.cls.required_capability = Capability.VIEW_REPORTS
