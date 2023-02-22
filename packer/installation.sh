#!/bin/bash

# Update package manager
sudo yum update -y

# Install Node.js
curl -sL https://rpm.nodesource.com/setup_14.x | sudo bash -
sudo yum install nodejs -y

# Install PostgreSQL
sudo amazon-linux-extras install postgresql11 -y

# Start and enable PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Configure PostgreSQL user and database
sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'Siddhartha';"
sudo -u postgres createdb mydatabase
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE mydatabase TO postgressudo yum list installed | grep postgresql;"

echo "Installation completed successfully."