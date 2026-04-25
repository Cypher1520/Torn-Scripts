// ==UserScript==
// @name            Attack screen improvements
// @namespace       http://tampermonkey.net/
// @version         1.3
// @description     Improvements to the Attacking screen.
// @author          Cypher-[2641265]
// @license         MIT
// @match           https://www.torn.com/page.php?sid=attack&user2ID=*
// @icon            https://www.google.com/s2/favicons?sz=64&domain=torn.com
// @grant           none
// ==/UserScript==

//-----Changelog-----
// v1.3 - 2026-04-22
// - Added defender health percent anchoring
// - Confirmed script key usage is torn_minimal_key with popup fallback when missing.

(function () {
  "use strict";

  // API Key management
  function getAPIKey() {
    return localStorage.getItem("torn_minimal_key");
  }

  function setAPIKey(key) {
    localStorage.setItem("torn_minimal_key", key);
  }

  // Health percent label placement: 'below' (under bar) or 'above' (under defender name)
  const HEALTH_PERCENT_ANCHOR = "above";
  const HEALTH_PERCENT_OFFSET_X = 15;
  const HEALTH_PERCENT_OFFSET_Y = 12;
  let healthPercentObserverInitialized = false;
  let healthPercentObserverRetryTimer = null;

  function syncHealthPercentOverlay() {
    const rosePanel = document.querySelector('div[class*="rose"]');
    if (!rosePanel) return;

    const wrap = rosePanel.querySelector("div.wrap___Gl_Ua.pbWrap___K0uUO");
    if (!wrap) return;

    const progressBar = wrap.querySelector('div[aria-label^="Progress:"]');
    if (!progressBar) return;

    const aria = progressBar.getAttribute("aria-label");
    const match = aria && aria.match(/Progress: ([\d.]+)%/);
    if (!match) return;

    const percent = match[1];
    let percentDiv = rosePanel.querySelector(".torn-health-percent");
    if (!percentDiv) {
      percentDiv = document.createElement("div");
      percentDiv.className = "torn-health-percent";
      percentDiv.style.position = "absolute";
      percentDiv.style.transform = "none";
      percentDiv.style.fontWeight = "bold";
      percentDiv.style.fontSize = "11px";
      percentDiv.style.color = "#fff";
      percentDiv.style.textShadow = "1px 1px 2px #222, 0 0 6px #000";
      percentDiv.style.pointerEvents = "none";
      percentDiv.style.zIndex = "100001";
      percentDiv.style.userSelect = "none";
      percentDiv.style.cursor = "default";
      rosePanel.appendChild(percentDiv);
    }

    if (getComputedStyle(rosePanel).position === "static") {
      rosePanel.style.position = "relative";
    }
    rosePanel.style.overflow = "visible";

    percentDiv.textContent = `${percent}%`;
    percentDiv.title = `Defender health: ${percent}%`;
    percentDiv.style.left = `${wrap.offsetLeft + 4 + HEALTH_PERCENT_OFFSET_X}px`;
    percentDiv.style.top = `${wrap.offsetTop + (HEALTH_PERCENT_ANCHOR === "above" ? -14 : 14) + HEALTH_PERCENT_OFFSET_Y}px`;
  }

  function ensureHealthPercentObserver() {
    if (healthPercentObserverInitialized) return;

    const rosePanel = document.querySelector('div[class*="rose"]');
    const wrap =
      rosePanel && rosePanel.querySelector("div.wrap___Gl_Ua.pbWrap___K0uUO");
    const progressBar =
      wrap && wrap.querySelector('div[aria-label^="Progress:"]');

    if (!progressBar) {
      if (healthPercentObserverRetryTimer === null) {
        healthPercentObserverRetryTimer = window.setTimeout(() => {
          healthPercentObserverRetryTimer = null;
          ensureHealthPercentObserver();
        }, 300);
      }
      return;
    }

    const observer = new MutationObserver(() => {
      syncHealthPercentOverlay();
    });
    observer.observe(progressBar, {
      attributes: true,
      attributeFilter: ["aria-label", "style"],
    });
    healthPercentObserverInitialized = true;
    syncHealthPercentOverlay();
  }

  const SVGs = {
    Online: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="-1.5 -1.2 14 14"><circle cx="6" cy="6" r="6" fill="#43d854" stroke="#fff" stroke-width="0"/></svg>`,
    Idle: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="-1.5 -1.2 14 14"><circle cx="6" cy="6" r="6" fill="#f7c325" stroke="#fff" stroke-width="0"/><rect x="5" y="3" width="4" height="4" fill="#f2f2f2"/></svg>`,
    Offline: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="-1.5 -1.2 14 14"><circle cx="6" cy="6" r="6" fill="#b3b3b3" stroke="#fff" stroke-width="0"/><rect x="3" y="5" width="6" height="2" fill="#f2f2f2"/></svg>`,
  };

  const urlParams = new URLSearchParams(window.location.search);
  const userID = urlParams.get("user2ID");
  if (!userID) return;

  // Check if API key is available
  let API_KEY = getAPIKey();
  if (!API_KEY) {
    showAPIKeySetup();
    return;
  }

  // API Key setup interface
  function showAPIKeySetup() {
    // Prevent multiple toasts from appearing
    if (document.getElementById('torn-api-toast')) return;
    
    // Create non-blocking toast container
    const toastContainer = document.createElement("div");
    toastContainer.id = 'torn-api-toast';
    toastContainer.style.position = "fixed";
    toastContainer.style.top = "0";
    toastContainer.style.left = "0";
    toastContainer.style.width = "100%";
    toastContainer.style.height = "100%";
    toastContainer.style.pointerEvents = "none"; // Click-through
    toastContainer.style.zIndex = "10000";
    
    // Create toast popup in upper right corner
    const toast = document.createElement("div");
    toast.style.position = "absolute";
    toast.style.top = "100px";
    toast.style.right = "20px";
    toast.style.width = "220px";
    toast.style.backgroundColor = "#2a2a2a";
    toast.style.border = "2px solid #00b7ff";
    toast.style.borderRadius = "8px";
    toast.style.padding = "15px";
    toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
    toast.style.fontFamily = "Arial, sans-serif";
    toast.style.fontSize = "14px";
    toast.style.color = "#fff";
    toast.style.pointerEvents = "auto"; // Toast itself is interactive
    toast.style.animation = "slideInFromRight 0.3s ease-out";

    // Add CSS animation
    if (!document.getElementById('toast-animations')) {
      const style = document.createElement('style');
      style.id = 'toast-animations';
      style.textContent = `
        @keyframes slideInFromRight {
          0% { transform: translateX(100%); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutToRight {
          0% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    const title = document.createElement("div");
    title.textContent = "API Key Required";
    title.style.fontWeight = "bold";
    title.style.marginBottom = "10px";
    title.style.fontSize = "16px";
    title.style.color = "#007bff";

    const message = document.createElement("div");
    message.textContent = "Requires a Minimal API key.";
    message.style.marginBottom = "15px";
    message.style.lineHeight = "1.4";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Enter your Torn API key";
    input.style.width = "100%";
    input.style.padding = "8px";
    input.style.marginBottom = "15px";
    input.style.backgroundColor = "#1a1a1a";
    input.style.color = "white";
    input.style.border = "1px solid #444";
    input.style.borderRadius = "4px";
    input.style.boxSizing = "border-box";

    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.gap = "8px";
    buttonContainer.style.justifyContent = "space-between";

    const getApiButton = document.createElement("button");
    getApiButton.textContent = "Get API";
    getApiButton.style.padding = "6px 12px";
    getApiButton.style.backgroundColor = "#007bff";
    getApiButton.style.color = "white";
    getApiButton.style.border = "none";
    getApiButton.style.borderRadius = "4px";
    getApiButton.style.cursor = "pointer";
    getApiButton.style.fontSize = "12px";

    const okButton = document.createElement("button");
    okButton.textContent = "Save";
    okButton.style.padding = "6px 12px";
    okButton.style.backgroundColor = "#0ea01fff";
    okButton.style.color = "white";
    okButton.style.border = "none";
    okButton.style.borderRadius = "4px";
    okButton.style.cursor = "pointer";
    okButton.style.fontSize = "12px";

    const dismissButton = document.createElement("button");
    dismissButton.textContent = "Later";
    dismissButton.style.padding = "6px 12px";
    dismissButton.style.backgroundColor = "#6c757d";
    dismissButton.style.color = "white";
    dismissButton.style.border = "none";
    dismissButton.style.borderRadius = "4px";
    dismissButton.style.cursor = "pointer";
    dismissButton.style.fontSize = "12px";

    function removeToast() {
      toast.style.animation = "slideOutToRight 0.3s ease-in";
      setTimeout(() => {
        if (toastContainer.parentNode) {
          toastContainer.remove();
        }
      }, 300);
    }

    getApiButton.addEventListener("click", () => {
      window.open("https://www.torn.com/preferences.php#tab=api", "_blank");
    });

    okButton.addEventListener("click", () => {
      const apiKey = input.value.trim();
      if (apiKey) {
        setAPIKey(apiKey);
        API_KEY = apiKey;
        removeToast();
        initializeScript();
      }
    });

    dismissButton.addEventListener("click", () => {
      removeToast();
    });

    // Enter key submits
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        okButton.click();
      }
    });

    // Auto-dismiss after 30 seconds to prevent permanent interference
    setTimeout(() => {
      if (document.getElementById('torn-api-toast')) {
        removeToast();
      }
    }, 30000);

    buttonContainer.appendChild(getApiButton);
    buttonContainer.appendChild(okButton);
    buttonContainer.appendChild(dismissButton);
    
    toast.appendChild(title);
    toast.appendChild(message);
    toast.appendChild(input);
    toast.appendChild(buttonContainer);
    toastContainer.appendChild(toast);
    document.body.appendChild(toastContainer);

    // Focus the input after a short delay to ensure it's visible
    setTimeout(() => {
      input.focus();
    }, 350);
  } // Initialize script features
  function initializeScript() {
    // Initial fetches
    fetchDefenderStatus();
    fetchAttackerEnergy();
    syncHealthPercentOverlay();
    ensureHealthPercentObserver();
  }

  // Unified refresh function for all elements
  function refreshAllData() {
    fetchDefenderStatus();
    fetchAttackerEnergy();
    syncHealthPercentOverlay();
  }

  // Fetch defender status
  function fetchDefenderStatus() {
    fetch(
      `https://api.torn.com/user/${userID}?selections=profile&key=${API_KEY}&comment=attackpageimprovements`,
    )
      .then((res) => res.json())
      .then((data) => {
        if (!data) return;

        // Check for API errors or missing expected data
        if (data.error || (!data.last_action && !data.status)) {
          console.log(
            "API issue detected in defender status - triggering API setup",
          );
          showAPIKeySetup();
          return;
        }

        // Handle online/offline status icon
        if (data.last_action && data.last_action.status) {
          const state = data.last_action.status;
          const svg = SVGs[state] || SVGs.Offline;

          function insertIcon() {
            const usernameElement = document.querySelector(
              'div[class*="rose"] .user-name',
            );
            if (usernameElement) {
              // Remove existing icon if present
              const existingIcon =
                usernameElement.parentNode.querySelector(".torn-status-icon");
              if (existingIcon) {
                existingIcon.remove();
              }

              const iconSpan = document.createElement("span");
              iconSpan.className = "torn-status-icon";
              iconSpan.innerHTML = svg;
              iconSpan.style.verticalAlign = "middle";
              iconSpan.style.marginRight = "4px";
              iconSpan.style.cursor = "pointer";
              iconSpan.title = state + " - Click to refresh";

              // Add click handler to refresh defender status
              iconSpan.addEventListener("click", () => {
                refreshAllData();
              });

              usernameElement.parentNode.insertBefore(
                iconSpan,
                usernameElement,
              );
            } else {
              setTimeout(insertIcon, 200);
            }
          }
          insertIcon();
        }

        // Handle health status display
        if (data.status && data.status.state) {
          const statusState = data.status.state;
          const statusColor = data.status.color || "gray";
          const statusUntil = data.status.until;

          function insertHealthStatus() {
            const usernameElement = document.querySelector(
              'div[class*="rose"] .user-name',
            );
            if (usernameElement) {
              // Remove existing health status if present
              const existingHealthStatus =
                usernameElement.parentNode.querySelector(".torn-health-status");
              if (existingHealthStatus) {
                existingHealthStatus.remove();
              }

              const healthContainer = document.createElement("span");
              healthContainer.className = "torn-health-status";
              healthContainer.style.marginLeft = "8px";
              healthContainer.style.fontSize = "0.85em";
              healthContainer.style.fontWeight = "bold";
              healthContainer.style.cursor = "pointer";

              // Color mapping for different states
              const colorMap = {
                red: "#dc3545",
                orange: "#fd7e14",
                yellow: "#ffc107",
                green: "#28a745",
                blue: "#007bff",
                gray: "#6c757d",
              };

              healthContainer.style.color = colorMap[statusColor] || "#6c757d";

              // Add click handler for refresh
              healthContainer.addEventListener("click", () => {
                // Check if the display shows "Click to refresh"
                if (healthContainer.textContent.includes("Click to refresh")) {
                  // Timer expired, refresh whole page
                  location.reload();
                } else {
                  // Timer still active, refresh all data
                  refreshAllData();
                }
              });

              syncHealthPercentOverlay();
              ensureHealthPercentObserver();

              function updateCountdown() {
                let displayText = statusState;
                // Add countdown timer if available
                if (statusUntil) {
                  const currentTime = Math.floor(Date.now() / 1000);
                  const timeRemaining = statusUntil - currentTime;
                  if (timeRemaining > 0) {
                    const hours = Math.floor(timeRemaining / 3600);
                    const minutes = Math.floor((timeRemaining % 3600) / 60);
                    const seconds = timeRemaining % 60;
                    if (hours > 0) {
                      displayText += ` (${hours}h ${minutes}m)`;
                    } else if (minutes > 0) {
                      displayText += ` (${minutes}m ${seconds}s)`;
                    } else {
                      displayText += ` (${seconds}s)`;
                    }
                  } else {
                    // Timer expired, show click to refresh message
                    displayText = statusState + " - Click to refresh";
                    healthContainer.style.textDecoration = "underline";
                  }
                }
                healthContainer.textContent = displayText;
              }
              // Initial update
              updateCountdown();
              // Update countdown every second if there's a timer
              if (statusUntil) {
                setInterval(updateCountdown, 1000);
              }
              usernameElement.parentNode.insertBefore(
                healthContainer,
                usernameElement.nextSibling,
              );
            } else {
              setTimeout(insertHealthStatus, 200);
            }
          }
          insertHealthStatus();
        }
      })
      .catch((error) => {
        console.log(
          "Network error in defender status fetch - triggering API setup",
        );
        showAPIKeySetup();
      });
  }

  // Fetch attacker energy
  function fetchAttackerEnergy() {
    fetch(
      `https://api.torn.com/user/?selections=bars&key=${API_KEY}&comment=attackerEnergy&comment=attackpageimprovements`,
    )
      .then((res) => res.json())
      .then((data) => {
        // Check for API errors or missing expected data (energy property)
        if (!data || data.error || !data.energy) {
          console.log(
            "API issue detected in energy fetch - triggering API setup",
          );
          showAPIKeySetup();
          return;
        }

        const currentEnergy = data.energy.current;
        const maxEnergy = data.energy.maximum;

        function insertEnergyDisplay() {
          const attackerUsernameElement = document.querySelector(
            'div[class*="green"] .user-name',
          );
          if (attackerUsernameElement) {
            // Remove existing energy display if present
            const existingEnergyDisplay =
              attackerUsernameElement.parentNode.querySelector(
                ".torn-energy-display",
              );
            if (existingEnergyDisplay) {
              existingEnergyDisplay.remove();
            }

            const energyContainer = document.createElement("div");
            energyContainer.className = "torn-energy-display";
            energyContainer.style.display = "inline-block";
            energyContainer.style.marginLeft = "8px";
            energyContainer.style.verticalAlign = "middle";
            energyContainer.style.cursor = "pointer";
            energyContainer.title = `Energy: ${currentEnergy}/${maxEnergy} - Click to refresh, Long press to change API key`;

            // Long press functionality for API key change
            let longPressTimer;
            let isLongPress = false;

            energyContainer.addEventListener("mousedown", () => {
              isLongPress = false;
              longPressTimer = setTimeout(() => {
                isLongPress = true;
                showAPIKeySetup();
              }, 1000); // 1 second long press
            });

            energyContainer.addEventListener("mouseup", () => {
              clearTimeout(longPressTimer);
            });

            energyContainer.addEventListener("mouseleave", () => {
              clearTimeout(longPressTimer);
            });

            // Touch events for mobile
            energyContainer.addEventListener("touchstart", (e) => {
              e.preventDefault();
              isLongPress = false;
              longPressTimer = setTimeout(() => {
                isLongPress = true;
                showAPIKeySetup();
              }, 1000);
            });

            energyContainer.addEventListener("touchend", (e) => {
              e.preventDefault();
              clearTimeout(longPressTimer);
              // If it wasn't a long press, treat as regular click
              if (!isLongPress) {
                refreshAllData();
              }
            });

            energyContainer.addEventListener("touchcancel", () => {
              clearTimeout(longPressTimer);
            });

            // Regular click handler (for mouse)
            energyContainer.addEventListener("click", (e) => {
              // Only refresh if it wasn't a long press
              if (!isLongPress) {
                refreshAllData();
              }
            }); // Create progress bar container
            const progressContainer = document.createElement("div");
            progressContainer.style.position = "relative";
            progressContainer.style.width = "80px";
            progressContainer.style.height = "12px";
            progressContainer.style.backgroundColor = "#2a2a2a";
            progressContainer.style.borderRadius = "8px";
            progressContainer.style.overflow = "hidden";
            progressContainer.style.border = "1px solid #444";

            // Create progress bar fill
            const progressBar = document.createElement("div");
            const percentage = (currentEnergy / maxEnergy) * 100;
            progressBar.style.width = `${percentage}%`;
            progressBar.style.height = "100%";
            progressBar.style.backgroundColor = "#0ea01fff";
            progressBar.style.borderRadius = "8px";
            progressBar.style.transition = "width 0.3s ease";

            // Create text display (overlaid on bar)
            const textDisplay = document.createElement("span");
            textDisplay.textContent = `${currentEnergy}/${maxEnergy}`;
            textDisplay.style.position = "absolute";
            textDisplay.style.top = "50%";
            textDisplay.style.left = "50%";
            textDisplay.style.transform = "translate(-50%, -50%)";
            textDisplay.style.fontSize = "10px";
            textDisplay.style.color = "#fff";
            textDisplay.style.fontWeight = "bold";
            textDisplay.style.textShadow = "1px 1px 2px rgba(0,0,0,0.8)";
            textDisplay.style.zIndex = "10";

            progressContainer.appendChild(progressBar);
            progressContainer.appendChild(textDisplay);
            energyContainer.appendChild(progressContainer);

            attackerUsernameElement.parentNode.insertBefore(
              energyContainer,
              attackerUsernameElement.nextSibling,
            );
          } else {
            setTimeout(insertEnergyDisplay, 200);
          }
        }
        insertEnergyDisplay();
      })
      .catch((error) => {
        console.log("Network error in energy fetch - triggering API setup");
        showAPIKeySetup();
      });
  }

  // Initialize script if API key is available
  if (API_KEY) {
    initializeScript();
  }
})();
