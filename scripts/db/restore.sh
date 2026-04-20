#!/bin/bash
set -e
[ -z "$1" ] && echo "Usage: restore.sh <file.sql>" && exit 1
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < "$1"
echo "Restore complete."
