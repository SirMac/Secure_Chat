from django.contrib.staticfiles.views import serve as serve_static

def _static_butler(request, path, **kwargs):
    return serve_static(request, path, insecure=True, **kwargs)