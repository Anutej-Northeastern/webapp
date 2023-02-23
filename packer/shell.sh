#!/bin/bash

# Update package manager
sudo yum update -y

# Install Node.js
curl -sL https://rpm.nodesource.com/setup_14.x | sudo bash -
sudo yum install nodejs -y


sudo tee /etc/yum.repos.d/pgdg.repo<<EOF
[pgdg13]
name=PostgreSQL 13 for RHEL/CentOS 7 - x86_64
baseurl=https://download.postgresql.org/pub/repos/yum/13/redhat/rhel-7-x86_64
enabled=1
gpgcheck=0
EOF

sudo yum install postgresql13 postgresql13-server -y
sudo /usr/pgsql-13/bin/postgresql-13-setup initdb

sudo systemctl start postgresql-13
sudo systemctl enable postgresql-13
sudo systemctl status postgresql-13
# Create a new database named "webapp"
sudo -u postgres createdb webapp

# Create a new user with the username "webapp" and password "postgres"
sudo -u postgres psql -c "CREATE USER webapp WITH PASSWORD 'postgres';"

# Grant all privileges to the "webapp" user on the "webapp" database
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE webapp TO webapp;"

# Restart PostgreSQL service
sudo systemctl restart postgresql-13