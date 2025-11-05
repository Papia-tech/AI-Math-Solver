// === Helper Functions (These can be defined first) ===
const menuToggle = document.getElementById("menuToggle");
const leftSidebar = document.querySelector(".left");
const mainContent = document.querySelector(".right");
const closeSidebarIcon = document.querySelector(".fa-arrow-up-from-bracket");

// ⭐️ NEW GLOBAL STATE: Track if the typing is currently running
let isTyping = false;
// ⭐️ NEW GLOBAL STATE: Store the function to stop/instantly complete typing
let instantComplete = null; 

/**
 * Truncates a string to a specific length and adds '...'
 */
function truncateText(text, maxLength) {
    if (!text) return "";
    if (text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength) + "...";
}

/**
 * Converts AI Markdown response to formatted HTML.
 * - Converts ### headings
 * - Converts * bullet points
 * - Converts **bold**
 * - Wraps plain text in <p> tags
 */
function formatAIResponse(text) {
    if (!text) return "";

    let lines = text.split('\n'); // Split by newline
    let htmlOutput = '';
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim(); // Trim whitespace

        // ### Heading
        if (line.startsWith('### ')) {
            if (inList) {
                htmlOutput += '</ul>\n'; // Close previous list
                inList = false;
            }
            // Add emoji and class for styling
            htmlOutput += `<h3 class="ai-heading">🧮 ${line.substring(4)}</h3>\n`;
        }
        // * Bullet point
        else if (line.startsWith('* ')) {
            if (!inList) {
                htmlOutput += '<ul>\n'; // Start new list
                inList = true;
            }
            // Process bold text *within* the list item
            let listItem = line.substring(2);
            listItem = listItem.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            htmlOutput += `<li>${listItem}</li>\n`;
        }
        // Normal text line
        else {
            if (inList) {
                htmlOutput += '</ul>\n'; // Close previous list
                inList = false;
            }

            // Process bold text
            let paragraph = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

            // Only add <p> tags if the line is not empty
            if (paragraph.length > 0) {
                htmlOutput += `<p>${paragraph}</p>\n`;
            }
        }
    }

    // Close list if file ends with it
    if (inList) {
        htmlOutput += '</ul>\n';
    }

    return htmlOutput;
}

// 🪄 NEW FUNCTION: Typing Animation
function typeWriterEffect(element, text, speed = 10) {
    isTyping = true; // Set global state
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    const nodes = Array.from(tempDiv.childNodes);
    
    element.innerHTML = ''; 

    let i = 0;
    let currentTimeout; // To hold the current timeout ID for cancellation

    // ⭐️ NEW: Function to instantly complete the typing
    instantComplete = function() {
        if (!isTyping) return;
        clearTimeout(currentTimeout); // Stop any pending character typing

        for (let j = i; j < nodes.length; j++) {
            const node = nodes[j].cloneNode(true);
            element.appendChild(node);
        }

        isTyping = false;
        instantComplete = null; // Clean up
        element.classList.remove('typing-container');
    };
    // ⭐️ END NEW

    function typeNode() {
        if (i < nodes.length) {
            const currentNode = nodes[i].cloneNode(true); 
            element.appendChild(currentNode);

            const textContent = currentNode.textContent;
            let charIndex = 0;
            
            if (textContent.trim().length > 0) {
                const originalHTML = currentNode.innerHTML;
                currentNode.innerHTML = ''; 

                function typeChar() {
                    if (!isTyping) return; // Exit if instantly completed
                    
                    if (charIndex < originalHTML.length) {
                        let charOrTag = originalHTML.substring(charIndex).match(/^(&#?[a-zA-Z0-9]+;|<[^>]+>|.)/);
                        charOrTag = charOrTag ? charOrTag[0] : originalHTML.charAt(charIndex);
                        
                        currentNode.innerHTML += charOrTag;
                        charIndex += charOrTag.length;
                        
                        currentTimeout = setTimeout(typeChar, speed);
                    } else {
                        i++;
                        currentTimeout = setTimeout(typeNode, 10); // Short delay before next element
                    }
                }
                typeChar();
            } else {
                i++;
                currentTimeout = setTimeout(typeNode, 10);
            }
        } else {
            // Typing is complete!
            isTyping = false;
            instantComplete = null; // Clean up
            element.classList.remove('typing-container');
        }
    }

    typeNode();
}
// 🪄 END NEW FUNCTION

/**
 * Handles the file selection from the file input.
 */
function handleFile(event) {
    const file = event.target.files[0];
    if (file) previewFile(file);
}

/**
 * Generates a preview for image or PDF files.
 */
function previewFile(file) {
    const imagePreview = document.getElementById("imagePreview");
    if (!imagePreview) return; // Safety check

    imagePreview.innerHTML = ""; // Clear old preview
    const reader = new FileReader();

    reader.onload = function (e) {
        // ✅ Image file
        if (file.type.startsWith("image/")) {
            const img = document.createElement("img");
            img.src = e.target.result;
            img.alt = file.name;
            img.classList.add("uploaded-image");

            // Click to open full size
            img.addEventListener("click", () => {
                const newTab = window.open();
                newTab.document.body.innerHTML = `<img src="${img.src}" style="max-width:100%;border-radius:10px;">`;
            });

            imagePreview.appendChild(img);
        }
        // 📄 PDF file
        else if (file.type === "application/pdf") {
            const pdfIcon = document.createElement("div");
            pdfIcon.innerHTML = `
                    <i class="fa-solid fa-file-pdf" style="font-size:40px;color:#FF5100;"></i>
                    <p style="color:#ccc;margin:5px 0;">${file.name}</p>
                `;
            pdfIcon.style.textAlign = "center";
            pdfIcon.style.cursor = "pointer";

            // Open PDF in new tab
            pdfIcon.addEventListener("click", () => {
                window.open(e.target.result, "_blank");
            });

            imagePreview.appendChild(pdfIcon);
        }
        // 🚫 Unsupported file
        else {
            alert("Unsupported file type. Please upload an image or PDF.");
        }
    };

    reader.readAsDataURL(file);
}


// === Main Script (Runs after HTML is loaded) ===

document.addEventListener("DOMContentLoaded", () => {
    // ⭐️ NEW EVENT LISTENER: Instantly complete typing when the page is hidden
    document.addEventListener("visibilitychange", function() {
        if (document.visibilityState === 'hidden' && isTyping && instantComplete) {
            instantComplete();
        }
    });
    // ⭐️ END NEW EVENT LISTENER

    // === 🎯 Element Declarations ===
    const historyList = document.getElementById("historyList");
    const clearHistory = document.getElementById("clearHistory");
    const display = document.getElementById("display");
    const output = document.getElementById("output");
    const sendBtn = document.getElementById("sendBtn");
    const mathInput = document.getElementById("mathInput");
    const fileInput = document.getElementById("fileInput");
    const imagePreview = document.getElementById("imagePreview");
    const imgDrop = document.getElementById("imgDrop");
    const themeToggle = document.getElementById("themeToggle");
    const logoutBtn = document.getElementById("logoutBtn");
    const signInBtn = document.getElementById("signInBtn");
    const profileBox = document.getElementById("profileBox");
    const logout = document.getElementById("logout"); // Profile box logout

    // === 🎧 Event Listeners ===
    if (clearHistory) {
        clearHistory.addEventListener("click", () => {
            historyList.innerHTML = "";
        });
    }

    if (imgDrop) {
        imgDrop.addEventListener("click", () => fileInput.click());
    }

    if (fileInput) {
        fileInput.addEventListener("change", handleFile);
    }

    if (imgDrop) {
        imgDrop.addEventListener("dragover", (event) => {
            event.preventDefault();
            imgDrop.style.borderColor = "#FF5100";
        });
        imgDrop.addEventListener("dragleave", () => {
            imgDrop.style.borderColor = "rgba(255, 255, 255, 0.3)";
        });
        imgDrop.addEventListener("drop", (event) => {
            event.preventDefault();
            imgDrop.style.borderColor = "rgba(255, 255, 255, 0.3)";
            const file = event.dataTransfer.files[0];
            if (file) previewFile(file);
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("loggedIn");
            localStorage.removeItem("loggedInUser");
            window.location.href = "login.html";
        });
    }

    if (signInBtn) {
        signInBtn.addEventListener("click", () => {
            const user = JSON.parse(localStorage.getItem("loggedInUser"));
            const isLoggedIn = localStorage.getItem("loggedIn");

            if (user && isLoggedIn === "true") {
                document.getElementById("userName").textContent = user.username;
                document.getElementById("userEmail").textContent = user.email || "No email found";
                profileBox.style.display = profileBox.style.display === "block" ? "none" : "block";
            } else {
                alert("Please log in first!");
                window.location.href = "login.html";
            }
        });
    }

    if (profileBox && signInBtn) {
        document.addEventListener("click", (event) => {
            if (!profileBox.contains(event.target) && event.target !== signInBtn) {
                profileBox.style.display = "none";
            }
        });
    }

    if (logout) {
        logout.addEventListener("click", () => {
            localStorage.removeItem("loggedIn");
            localStorage.removeItem("loggedInUser");
            window.location.href = "login.html";
        });
    }

    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            document.body.classList.toggle("light-mode");

            if (document.body.classList.contains("light-mode")) {
                themeToggle.classList.replace("fa-regular", "fa-solid");
                localStorage.setItem("theme", "light");
            } else {
                themeToggle.classList.replace("fa-solid", "fa-regular");
                localStorage.setItem("theme", "dark");
            }
        });
    }

    if (mathInput) {
        mathInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();

                if (sendBtn) {
                    sendBtn.click();
                }
            }
        });
    }


    // === 🚀 Main Solve Function ===
    if (sendBtn) {
        sendBtn.addEventListener("click", async () => {
            const question = mathInput.value.trim();
            if (!question) return alert("Enter a math question!");

            // *** MODIFIED: Clear the input box immediately ***
            mathInput.value = "";

            // 1. Show the question in the display box
            if (display) {
                display.innerHTML = `<p><strong>Expression:</strong> ${question}</p>`;
            }

            // 2. Clear old output and show a loading message
            if (output) {
                // Add the cursor class BEFORE the fetch to indicate the AI is "thinking/typing"
                output.classList.add("typing-container"); 
                
                output.innerHTML = `
                    <div class="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                `;
            }

            try {
                const res = await fetch("/api/solve", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ question }),
                });

                if (!res.ok) throw new Error("Server returned an error");

                const data = await res.json();
                const resultText = data.result || data.error || "No result received";

                // 3. Format the AI response
                const formattedResult = formatAIResponse(resultText);
                
                // 4. Use the typing effect function!
                if (output) {
                    // Remove loading dots before typing
                    output.innerHTML = ''; 
                    typeWriterEffect(output, formattedResult);
                }

                // 5. Create truncated versions for history preview
                const historyQuestion = truncateText(question, 20); // Shortened limit
                const historyPreviewText = truncateText(resultText, 0); // Shortened limit

                // 6. Format the truncated preview text (simple formatting)
                let formattedHistoryPreview = historyPreviewText.replace(/\*\*(.*?)\*\*/g, '$1'); 
                formattedHistoryPreview = formattedHistoryPreview.replace(/^### (.*)$/gm, '$1'); 
                formattedHistoryPreview = formattedHistoryPreview.replace(/^\* /gm, ''); 
                formattedHistoryPreview = formattedHistoryPreview.replace(/\n/g, ' '); 

                // 7. Add to history
                const now = new Date();
                const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const date = now.toLocaleDateString([], { day: '2-digit', month: 'short' });

                const historyItemHTML = `
                    <div class="history-item">
                        <p><strong>${historyQuestion}</strong></p>
                        <p>${formattedHistoryPreview}</p>
                        <div class="timestamp">${time} - ${date}</div>
                    </div>
                `;

                if (historyList) {
                    historyList.insertAdjacentHTML("afterbegin", historyItemHTML);
                }

            } catch (err) {
                console.error("❌ Fetch error:", err);
                const errorMsg = "❌ Could not connect to the backend server. Make sure it's running!";
                if (output) {
                    // If an error occurs, stop the animation and show the error
                    output.classList.remove('typing-container');
                    output.innerHTML = `<strong style="color: #ff5100;">${errorMsg}</strong>`;
                }
            }
        });
    }

    // === Sidebar Toggle Logic ===
    menuToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        if (window.innerWidth <= 900) {
            leftSidebar.classList.toggle("sidebar-open");
        } else {
            document.body.classList.toggle("sidebar-collapsed");
        }
    });

    closeSidebarIcon.addEventListener("click", () => {
        if (window.innerWidth <= 900) {
            leftSidebar.classList.remove("sidebar-open");
        } else {
            document.body.classList.add("sidebar-collapsed");
        }
    });

    mainContent.addEventListener("click", () => {
        if (window.innerWidth <= 900 && leftSidebar.classList.contains("sidebar-open")) {
            leftSidebar.classList.remove("sidebar-open");
        }
    });

    historyList.addEventListener("click", (e) => {
        if (window.innerWidth <= 900 && e.target.closest(".history-item") && leftSidebar.classList.contains("sidebar-open")) {
            leftSidebar.classList.remove("sidebar-open");
        }
    });

    // === Page Load / Initialization Logic ===
    const user = JSON.parse(localStorage.getItem("loggedInUser"));
    const isLoggedIn = localStorage.getItem("loggedIn");

    if (user && isLoggedIn === "true") {
        const welcomeEl = document.getElementById("welcome");
        if (welcomeEl) welcomeEl.textContent = `Welcome, ${user.username}!`;
    } else {
        alert("Please log in first!");
        window.location.href = "login.html";
    }

    if (localStorage.getItem("theme") === "light") {
        document.body.classList.add("light-mode");
        if (themeToggle) {
            themeToggle.classList.replace("fa-regular", "fa-solid");
        }
    }

});

// 3. ✨ NEW: Check for and run the initial question
const initialQuestion = localStorage.getItem("expression");
if (initialQuestion) {
    const mathInput = document.getElementById("mathInput");
    const sendBtn = document.getElementById("sendBtn");

    if (mathInput) {
        mathInput.value = initialQuestion;
    }

    if (sendBtn) {
        sendBtn.click();
    }

    localStorage.removeItem("expression");
}