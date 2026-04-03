from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin

from django.shortcuts import redirect

# def home_redirect(request):
#     return redirect("https://swasthgram.netlify.app")



from django.http import JsonResponse

def health_check(request):
    return JsonResponse({"status": "ok"})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('authentication.urls')),  
    path('healthz', health_check),
    path('', include('hygiene.urls')),
    path('', api_home),  
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)