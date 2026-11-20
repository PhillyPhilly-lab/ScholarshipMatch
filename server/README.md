
# ScholarshipMatch AI Backend

This folder contains the secure backend for the ScholarshipMatch AI assistant.

## What it does

- Connects the website chatbot to OpenAI.
- Answers questions about scholarships and financial aid.
- Researches current information using web search.
- Provides source links with answers.

## Setup

The backend requires Node.js and an OpenAI API key.

Required environment variables:

- OPENAI_API_KEY
- OPENAI_MODEL
- FRONTEND_ORIGIN
- PORT

## Security

Never place the OpenAI API key in website JavaScript or commit it to GitHub.

The API key must remain private in the backend hosting service.
