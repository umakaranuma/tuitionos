#!/bin/bash
set -e
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME > /tmp/tuitionos_$DATE.sql
echo "Backup done: tuitionos_$DATE.sql"
