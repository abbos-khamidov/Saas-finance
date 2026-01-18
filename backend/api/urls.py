from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'users', views.UserViewSet, basename='user')
router.register(r'transactions', views.TransactionViewSet, basename='transaction')
router.register(r'settings', views.UserSettingsViewSet, basename='settings')
router.register(r'goals', views.FinancialGoalViewSet, basename='goal')
router.register(r'categories', views.CategoryViewSet, basename='category')

urlpatterns = [
    path('', include(router.urls)),
    path('analytics/<int:user_id>/', views.analytics, name='analytics'),
    path('insights/<int:user_id>/', views.insights, name='insights'),
]
