# Chrome Web Store — Data usage disclosure

Use this when filling out the **Privacy practices → Data usage** section in the Chrome Web Store Developer Dashboard. Epstein Manifest does **not** collect user data.

---

## What Epstein Manifest does and doesn’t do

- **Does not collect** any data from the user or from their browsing and does not send it to any server.
- **Reads page text only in the browser** to match names; nothing is transmitted off the device.
- **Stores only** (in `chrome.storage.local` on the user’s device):
  - The cached list of names from Wikipedia (public data).
  - The user’s display preferences (e.g. highlight on/off, colors).
- **Makes one kind of outbound request:** fetching the public Wikipedia name list. No user or page data is included in that request.

So under Chrome’s User Data Policy, the extension **does not handle personal or sensitive user data** (no collecting, transmitting, using, or sharing of such data).

---

## What to select in “Data usage”

The form has two parts:

### 1. Types of data your extension collects (first group of checkboxes)

**Select: the option that says you do NOT collect user data.**

- If there is a checkbox like **“This extension does not collect any user data”** or **“No user data is collected”**, **check that one** and leave all “data type” checkboxes **unchecked** (e.g. do not check “Browsing history”, “Personal communications”, “User-generated content”, etc.).
- If the form only lists data types (e.g. “Browsing history”, “Personal information”, “Website content”), **leave every one unchecked** to indicate you collect none of them.

**Do not check** any category that implies collection or transmission, such as:
- Browsing history
- Personal communications
- User-generated content
- Website content (we read it only locally and do not collect or send it)

---

### 2. Certification / limited use (second group of checkboxes)

**Select: the certification that fits “limited use” / no unnecessary data use.**

- Check the box that certifies your extension **complies with the Chrome Web Store policy on limited use** (or words to that effect).
- If there are multiple certification statements, check the one(s) that say you use data only as needed for the extension’s single purpose and do not use it for unrelated purposes (e.g. advertising, selling data). For Epstein Manifest, we don’t collect data at all, so those certifications apply.

---

## Short text you can use in the form or “Justification”

If there’s a free-text field for data usage or justification, you can paste something like:

**Option A (short):**  
“This extension does not collect any user data. Page text is processed only locally to highlight names; nothing is sent to any server. The only data stored is the cached Wikipedia name list and the user’s display preferences, both kept only in the browser’s local storage.”

**Option B (one sentence):**  
“No user data is collected; all processing is local and only the Wikipedia name list and user preferences are stored locally.”

---

## Privacy policy

Your **PRIVACY.md** already states that you do not collect, store, or transmit personal data. Use the same URL you add in the store listing (e.g. GitHub raw or a hosted copy of PRIVACY.md) as the **Privacy policy** link in the dashboard. That satisfies the requirement to explain that you are not handling user data.

---

## Remote code

For **“Do you use remote code?”** (or similar):  
**Select: “No, I am not using remote code.”**  
The extension only runs its own packaged scripts; it does not load or execute code from the network.
