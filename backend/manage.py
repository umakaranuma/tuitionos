#!/usr/bin/env python
import os, sys
def main():
    from environs import Env
    env = Env()
    env.read_env() # Automatically reads .env file
    
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)
if __name__ == '__main__':
    main()
