# Agent Survey for Dynamics 365 Contact Center

A lightweight, no-code survey solution for Dynamics 365 Contact Center that automatically presents agents with a configurable survey popup during conversation wrap-up.

## Components

| File | Web Resource Name | Description |
|------|-------------------|-------------|
| `AgentSurveyWrapup.js` | `crd9b_/scripts/AgentSurveyWrapup.js` | Form script that polls for wrap-up conversations and triggers the survey dialog |
| `new_AgentSurveyForm.htm` | `new_AgentSurveyForm` | Survey popup form displayed to agents — dynamically renders toggle/text questions |
| `new_SurveyQuestionManager.htm` | `new_SurveyQuestionManager` | Admin interface for managing questions, themes, previewing surveys, and analytics dashboard |

## Features

- **Dynamic Survey Questions** — Add, edit, reorder, and toggle questions without code changes
- **Multiple Field Types** — Toggle (Yes/No), Text, Number, Date, Email, Decimal, Multi-line Text
- **Theme Customization** — Choose from preset colors or pick a custom theme for the survey popup
- **Global Enable/Disable** — Turn the survey popup on or off across the entire organization
- **Mandatory Questions** — Mark questions as required with real-time validation
- **Analytics Dashboard** — Built-in analytics with KPIs, agent breakdown charts, donut charts for toggle questions, and a filterable response table
- **Multi-Agent Filter** — Filter analytics by agent, question, and date range
- **Duplicate Prevention** — Three-layer guard (window.top, localStorage, database) prevents duplicate surveys
- **Environment Portable** — Uses `EntityDefinitions(LogicalName=...)` alternate key instead of hardcoded GUIDs

## Setup

1. Import the three web resources into your Dynamics 365 solution
2. Create a custom entity named `crd9b_agentsurveyform` (or adjust the entity name in all files)
3. Register `AgentSurveyWrapup.onLoad` on the Active Conversation form's `OnLoad` event
4. Open `new_SurveyQuestionManager` web resource to manage questions and view analytics

## Author

Created by [Mauricio Oliveira](https://www.linkedin.com/in/mauriciooliveira/) — GBB Contact Center
