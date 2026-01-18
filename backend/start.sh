#!/bin/bash
# Script to start Django backend

echo "Creating virtual environment..."
python -m venv venv

echo "Activating virtual environment..."
source venv/bin/activate  # On Windows: venv\Scripts\activate

echo "Installing dependencies..."
pip install -r requirements.txt

echo "Running migrations..."
python manage.py migrate

echo "Creating superuser (optional)..."
python manage.py createsuperuser --noinput || echo "Superuser creation skipped"

echo "Starting Django server..."
python manage.py runserver
