from rest_framework.authtoken.views import obtain_auth_token
from django.urls import path
from django.views.generic import TemplateView
from . import views
urlpatterns = [
    path('', TemplateView.as_view(template_name='login.html'), name='login'),
    path('register/', TemplateView.as_view(template_name='register.html'), name='register'),
    path('admin/', TemplateView.as_view(template_name="admin.html"), name="admin"),
    path('viewer/', TemplateView.as_view(template_name="viewer.html"), name="viewer")
]