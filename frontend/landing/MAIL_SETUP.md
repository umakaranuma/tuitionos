# Mail Service Configuration

## Overview
This document outlines the email service integration used for the "Request Demo" form on the TuitionOS landing page.

## Service Provider
We are using **Web3Forms** (https://web3forms.com/) as our mail delivery service. It allows us to securely send emails directly from the client-side React application without the need to maintain our own backend SMTP server.

## Account Information
The Web3Forms service is linked to the primary business account. All demo request submissions are routed directly to this inbox.

- **Linked Email Account:** `fynux.bussiness@gmail.com`
- **Associated Account Name:** Fynux

## API Configuration
- **Access Key:** `13595c1b-ccf2-403f-b332-b1ba43e4f284`
- **File Location:** The implementation is encapsulated in the `src/lib/mailService.ts` utility file.

## How it Works
1. A user fills out the demo request form on the landing page (`page.tsx`).
2. The form data (Name, Institute, Email, Phone) is passed to `sendDemoRequest()` located in `src/lib/mailService.ts`.
3. A POST request is sent to `https://api.web3forms.com/submit` with the form payload and the Access Key.
4. Web3Forms processes the request and automatically delivers the email to `fynux.bussiness@gmail.com`.
