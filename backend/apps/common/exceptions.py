from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return None

    detail = response.data
    response.data = {
        "error": {
            "code": getattr(exc, "default_code", "api_error").upper(),
            "message": "The request could not be completed.",
            "details": detail,
        }
    }
    return response
