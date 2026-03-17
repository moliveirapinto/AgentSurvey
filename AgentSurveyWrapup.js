/// <reference path="Xrm" />
// Agent Survey Wrap-up Handler
// In D365 Contact Center, the Active Conversation form loads without an entity
// record ID (the Conversation Control manages state via SignalR). We therefore
// query Xrm.WebApi for the current agent's conversations in Wrap-up status.

var AgentSurveyWrapup = (function () {
    "use strict";

    var WRAPUP_STATUS_CODE = 5;
    var POLL_INTERVAL_MS = 4000;
    var SURVEY_ENTITY = "crd9b_agentsurveyform";
    var ENTITY_DEF_PATH = "EntityDefinitions(LogicalName='" + SURVEY_ENTITY + "')";
    var _pollTimer = null;
    var STORAGE_KEY = "_agentSurveyShown";

    // ── Duplicate prevention: window.top + localStorage + DB ────────────
    // In D365 CSW, each session tab runs in its own iframe. The IIFE scope
    // resets on tab switch / form reload, so in-memory guards alone are not
    // enough. We store shown-IDs in THREE places:
    //   1. window.top (shared across all iframes in the CSW page)
    //   2. localStorage (persists across page reloads)
    //   3. Database check before every dialog open (ultimate safety net)

    function _topMap() {
        try {
            if (!window.top._agentSurveyShownMap) window.top._agentSurveyShownMap = {};
            return window.top._agentSurveyShownMap;
        } catch (e) { return null; }
    }

    function isSurveyShown(convId) {
        var key = convId.toLowerCase();
        // 1. Check window.top (fastest, shared across all session iframes)
        try {
            var tm = _topMap();
            if (tm && tm[key]) return true;
        } catch (e) { /* cross-origin fallback */ }
        // 2. Check localStorage
        try {
            var map = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
            if (map[key]) {
                // Also sync to window.top for future checks
                try { var tm2 = _topMap(); if (tm2) tm2[key] = map[key]; } catch (e2) {}
                return true;
            }
        } catch (e) {}
        return false;
    }

    function markSurveyShown(convId) {
        var key = convId.toLowerCase();
        var ts = Date.now();
        // 1. Mark in window.top
        try { var tm = _topMap(); if (tm) tm[key] = ts; } catch (e) {}
        // 2. Mark in localStorage
        try {
            var map = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
            map[key] = ts;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
        } catch (e) { /* ignore */ }
    }

    function onLoad(executionContext) {
        console.log("[AgentSurvey] onLoad fired");

        var formContext = executionContext.getFormContext();

        // Try to get record ID directly from form context
        var recordId = "";
        try {
            recordId = formContext.data.entity.getId().replace(/[{}]/g, "").toLowerCase();
        } catch (e) { /* ignore */ }

        if (recordId) {
            console.log("[AgentSurvey] Got record ID from form: " + recordId);
            startConversationPolling(recordId);
            return;
        }

        // Active Conversation form in CSW doesn't expose entity ID.
        // Fall back to querying for this agent's wrap-up conversations.
        console.log("[AgentSurvey] No record ID on form — using agent-based polling");
        startAgentPolling();
    }

    // ── Path A: we have a specific conversation ID ──────────────────────
    var _convTimers = {};

    function startConversationPolling(conversationId) {
        if (_convTimers[conversationId]) return;
        checkConversationStatus(conversationId);
        _convTimers[conversationId] = setInterval(function () {
            checkConversationStatus(conversationId);
        }, POLL_INTERVAL_MS);
        console.log("[AgentSurvey] Conversation polling started: " + conversationId);
    }

    function checkConversationStatus(conversationId) {
        if (isSurveyShown(conversationId)) {
            stopConvPolling(conversationId);
            console.log("[AgentSurvey] Conv already surveyed (localStorage): " + conversationId);
            return;
        }
        Xrm.WebApi.retrieveRecord(
            "msdyn_ocliveworkitem", conversationId, "?$select=statuscode"
        ).then(function (r) {
            console.log("[AgentSurvey] Conv poll statuscode: " + r.statuscode);
            if (r.statuscode === WRAPUP_STATUS_CODE) {
                stopConvPolling(conversationId);
                openSurveyDialog(conversationId);
            } else if (r.statuscode === 4 || r.statuscode === 6) {
                stopConvPolling(conversationId);
            }
        }, function (err) {
            console.error("[AgentSurvey] Conv poll error: " + err.message);
            stopConvPolling(conversationId);
        });
    }

    function stopConvPolling(conversationId) {
        if (_convTimers[conversationId]) {
            clearInterval(_convTimers[conversationId]);
            delete _convTimers[conversationId];
            console.log("[AgentSurvey] Conv polling stopped: " + conversationId);
        }
    }

    // ── Path B: query for agent's wrap-up conversations ─────────────────
    function startAgentPolling() {
        if (_pollTimer) {
            console.log("[AgentSurvey] Agent polling already running");
            return;
        }

        var userId = Xrm.Utility.getGlobalContext()
            .userSettings.userId.replace(/[{}]/g, "").toLowerCase();
        console.log("[AgentSurvey] Agent polling started for userId: " + userId);

        checkForWrapup(userId);
        _pollTimer = setInterval(function () {
            checkForWrapup(userId);
        }, POLL_INTERVAL_MS);
    }

    function checkForWrapup(userId) {
        var options = "?$select=msdyn_ocliveworkitemid&$filter=statuscode eq "
            + WRAPUP_STATUS_CODE
            + " and _msdyn_activeagentid_value eq " + userId;

        Xrm.WebApi.retrieveMultipleRecords("msdyn_ocliveworkitem", options).then(
            function (results) {
                if (!results.entities || results.entities.length === 0) {
                    return;
                }
                for (var i = 0; i < results.entities.length; i++) {
                    var convId = results.entities[i].msdyn_ocliveworkitemid.toLowerCase();
                    if (!isSurveyShown(convId)) {
                        console.log("[AgentSurvey] Wrap-up found: " + convId);
                        openSurveyDialog(convId);
                        return; // one at a time
                    }
                }
            },
            function (err) {
                console.error("[AgentSurvey] Agent poll error: " + err.message);
            }
        );
    }

    // ── Survey dialog ───────────────────────────────────────────────────
    function openSurveyDialog(conversationId) {
        conversationId = conversationId.toLowerCase();
        // Re-check right before opening (another tab may have marked it)
        if (isSurveyShown(conversationId)) {
            console.log("[AgentSurvey] Already shown (memory/localStorage gate): " + conversationId);
            return;
        }
        // Check if a survey response already exists in the database
        // Query both the lookup field AND the text field for robustness
        Xrm.WebApi.retrieveMultipleRecords(
            SURVEY_ENTITY,
            "?$select=crd9b_agentsurveyformid&$filter=_crd9b_conversationid_value eq " + conversationId
            + " or crd9b_newconversationid eq '" + conversationId + "'&$top=1"
        ).then(function (result) {
            if (result.entities && result.entities.length > 0) {
                console.log("[AgentSurvey] Survey already submitted for: " + conversationId + ". Skipping.");
                markSurveyShown(conversationId);
                return;
            }
            // Mark BEFORE launching so other tabs see it immediately
            markSurveyShown(conversationId);
            checkGlobalEnabledAndLaunch(conversationId);
        }, function (err) {
            // On error, do NOT show the dialog — fail closed to prevent duplicates
            console.warn("[AgentSurvey] Could not verify survey status: " + err.message + ". Skipping to be safe.");
        });
    }

    function checkGlobalEnabledAndLaunch(conversationId) {
        console.log("[AgentSurvey] Checking if survey is globally enabled...");

        var clientUrl = Xrm.Utility.getGlobalContext().getClientUrl();
        var xhr = new XMLHttpRequest();
        xhr.open("GET", clientUrl + "/api/data/v9.2/" + ENTITY_DEF_PATH + "?$select=Description", true);
        xhr.setRequestHeader("OData-MaxVersion", "4.0");
        xhr.setRequestHeader("OData-Version", "4.0");
        xhr.onload = function () {
            var enabled = true;
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    var desc = "";
                    if (data.Description && data.Description.LocalizedLabels && data.Description.LocalizedLabels.length > 0) {
                        desc = data.Description.LocalizedLabels[0].Label;
                    }
                    var config = JSON.parse(desc);
                    enabled = config.surveyEnabled !== false;
                } catch (e) { /* default enabled */ }
            }
            if (!enabled) {
                console.log("[AgentSurvey] Survey popup is globally disabled. Skipping.");
                return;
            }
            launchSurveyDialog(conversationId);
        };
        xhr.onerror = function () {
            // On error, default to showing the survey
            launchSurveyDialog(conversationId);
        };
        xhr.send();
    }

    function launchSurveyDialog(conversationId) {
        console.log("[AgentSurvey] Opening survey dialog for: " + conversationId);

        var pageInput = {
            pageType: "webresource",
            webresourceName: "new_AgentSurveyForm",
            data: conversationId
        };

        var navigationOptions = {
            target: 2,
            position: 1,
            width: { value: 500, unit: "px" },
            height: { value: 580, unit: "px" },
            title: "Agent Survey - Wrap-up"
        };

        Xrm.Navigation.navigateTo(pageInput, navigationOptions).then(
            function () {
                console.log("[AgentSurvey] Survey dialog completed.");
            },
            function (error) {
                console.error("[AgentSurvey] Error opening survey: " + error.message);
            }
        );
    }

    return {
        onLoad: onLoad
    };
})();
