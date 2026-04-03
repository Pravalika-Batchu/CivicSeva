from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('register-citizen/', views.register_citizen, name='register_citizen'),
    path('register-officer/', views.register_officer, name='register_officer'),
    path('register-admin/', views.register_admin, name='register_admin'),
    path('login/', views.login_user, name='login_user'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('get-csrf/', views.get_csrf_token, name='get_csrf_token'),
    
]