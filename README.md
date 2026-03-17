# Agent Survey for Dynamics 365 Contact Center

A lightweight, no-code survey solution for Dynamics 365 Contact Center that automatically presents agents with a configurable survey popup during conversation wrap-up.

![Survey Manager — Full Dashboard](img/full.jpeg)

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

## Survey Popup

When an agent's conversation enters wrap-up status, the survey popup automatically appears:

![Survey Popup](img/popup.png)

## Setup Guide

### Prerequisites

- A Dynamics 365 Customer Service environment with the Contact Center (Omnichannel) module
- System Administrator or System Customizer security role
- An unmanaged solution in your environment to hold the components

### Step 1: Create the Custom Entity

1. Open [Power Apps](https://make.powerapps.com) and select your environment
2. Go to **Tables** (under **Dataverse**) and click **+ New table**
3. Create a table with display name **Agent Survey Form** (logical name: `crd9b_agentsurveyform`)
   > **Note:** The `crd9b_` prefix depends on your publisher. If your publisher uses a different prefix, update the `SURVEY_ENTITY` / `SURVEY_ENTITY_NAME` variable in all three files to match
4. Save and publish the table

### Step 2: Import the Web Resources

1. Open [Power Apps](https://make.powerapps.com) and select your environment
2. Go to **Solutions** and open your unmanaged solution
3. Click **+ Add existing** → **More** → **Web resource** if they already exist, or create new ones:
   - Click **+ New** → **More** → **Web resource**
   - For each file, set:
     - **AgentSurveyWrapup.js** — Name: `crd9b_/scripts/AgentSurveyWrapup.js`, Type: `Script (JScript)`
     - **new_AgentSurveyForm.htm** — Name: `new_AgentSurveyForm`, Type: `Webpage (HTML)`
     - **new_SurveyQuestionManager.htm** — Name: `new_SurveyQuestionManager`, Type: `Webpage (HTML)`
   - Upload each file and click **Save**, then **Publish**

### Step 3: Register the Script on the Active Conversation Form

This step makes the survey popup appear automatically when agents wrap up conversations.

1. Open [Power Apps](https://make.powerapps.com) → **Solutions** → open your solution
2. Click **+ Add existing** → **Entity** → search for **Conversation** (`msdyn_ocliveworkitem`) and add it
3. Open the **Conversation** entity → **Forms**
4. Open the **Active Conversation** form (or the form used by your agents)
5. Go to **Form Properties** (or click the **Events** tab in the modern form designer):
   - Under **Form Libraries**, click **+ Add library**
   - Search for `crd9b_/scripts/AgentSurveyWrapup.js` and add it
6. Under **Event Handlers**, on the **OnLoad** event:
   - Click **+ Add Event Handler**
   - Library: `crd9b_/scripts/AgentSurveyWrapup.js`
   - Function: `AgentSurveyWrapup.onLoad`
   - Check **Pass execution context as first parameter**
   - Click **Done**
7. Click **Save and Publish**

### Step 4: Open the Survey Manager

The Survey Manager is where you configure questions, set the theme, and view analytics.

1. Open the **Customer Service Admin Center** app in your D365 environment:
   - Navigate to `https://[your-org].crm.dynamics.com/main.aspx`
   - From the app switcher (top-left), select **Customer Service Admin Center**
2. You can open the Survey Manager web resource directly via URL:
   ```
   https://[your-org].crm.dynamics.com/WebResources/new_SurveyQuestionManager
   ```
   Replace `[your-org]` with your organization's subdomain (e.g., `mycompany`)
3. Alternatively, add it as a **Sitemap entry** for easy access:
   - In your solution, go to **Model-driven Apps** → open your app (e.g., Customer Service Admin Center or Customer Service Workspace)
   - Open the **Site Map** editor
   - Add a new **Sub Area** with:
     - Type: **Web Resource**
     - Web Resource: `new_SurveyQuestionManager`
     - Title: `Survey Manager`
   - Save and publish the app

### Step 5: Configure Your Survey

Once the Survey Manager is open:

1. **Enable the survey** — Toggle the global switch at the top to enable the survey popup
2. **Add questions** — Click **+ New Question**, enter the question text, choose a data type, and optionally mark it as required
3. **Set the theme** — Pick a color from the swatches or choose a custom color for the survey popup header
4. **Preview** — Click **Preview** to see how the survey will look to agents
5. **Reorder** — Drag and drop questions in the table to change their order
6. **Analytics** — Click the **Analytics** button to view the dashboard with response data, agent breakdowns, and question charts

## Author

Created by [Mauricio Oliveira](https://www.linkedin.com/in/mauriciooliveira/) — GBB Contact Center
