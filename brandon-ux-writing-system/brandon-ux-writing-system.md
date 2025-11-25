# Brandon UX Writing System
**Brand Asset Assistant for Automotive & Technology Companies**

---

## Voice Chart

### Brand Concepts

**1. Expert Guide**
- Voice: Knowledgeable, confident, precise
- Brandon knows brand assets inside-out and helps users find exactly what they need
- ✅ Do: "Found 12 images matching your brand guidelines"
- ❌ Don't: "Here are some results that might work"

**2. Efficiency-First**
- Voice: Direct, fast, practical
- Brandon respects users' time and gets them to their assets quickly
- ✅ Do: "3 logos ready to download"
- ❌ Don't: "We've found several logo options that you might find useful"

**3. Collaborative Partner**
- Voice: Supportive, conversational, human
- Brandon works alongside designers and brand teams, not as a system
- ✅ Do: "Let me refine that search for you"
- ❌ Don't: "System processing request"

---

## Core Interface Copy

### Search Input
**Label**: "Describe the asset you need"

**Placeholder**: "e.g., electric vehicle hero image, blue gradient background"

**Helper text**: "Try natural language. I understand colours, contexts, and brand guidelines."

### Primary Actions

**Search button**: "Find assets"

**Download button**: "Download original"

**Add to collection**: "Save to collection"

**Share results**: "Share search"

**Clear search**: "Start over"

---

## Search States

### Empty State (First Use)
**Headline**: "What brand asset do you need?"

**Body**: "Describe it naturally. I'll search through your library and find matches based on colours, subjects, usage context, and brand guidelines."

**Primary CTA**: "Try example search"

**Example suggestions** (as clickable chips):
- "Electric SUV on mountain road"
- "Gradient backgrounds for mobile"
- "Corporate logo variations"

### Empty State (No Results)
**Headline**: "Nothing matches that description"

**Body**: "Try broader terms or check if the asset exists in your library. I searched colour palettes, contexts, and metadata."

**Suggestions**:
- Broaden search terms (remove specific colours or contexts)
- Check spelling
- Browse by category

**Secondary CTA**: "View all assets"

### Search Results
**Result count**: "Found 8 assets"

**Sort options**:
- "Most relevant"
- "Newest first"
- "Oldest first"

**Filter label**: "Refine results"

---

## Error Messages

### Upload Errors

**File too large**
"Upload failed. File exceeds 50MB. Compress the image or choose a smaller file."

**Unsupported format**
"Can't upload this format. Brandon supports JPG, PNG, SVG, and WebP. Convert your file and try again."

**Upload interrupted**
"Upload stopped. Connection lost. Reconnect and try again."

### Search Errors

**Search service down**
"Search unavailable. Our service is temporarily down. Try again in a few minutes."

**Invalid query**
"Couldn't understand that search. Try describing the asset type, colour, or context you need."

**Timeout error**
"Search took too long. Simplify your query or try again."

### Authentication Errors

**Session expired**
"Session expired. Log in again to continue working."

**Permission denied**
"Can't access this library. Request access from your brand manager."

**Account suspended**
"Account suspended. Contact your administrator to restore access."

### Download Errors

**Download failed**
"Download failed. File is temporarily unavailable. Try again or contact support."

**Storage limit reached**
"Can't download. Storage limit reached. Delete unused files or upgrade your plan."

---

## Success Messages

### Upload Success
"Asset uploaded. Processing for search in a few seconds."

### Download Success
"Downloaded to your device"

### Collection Created
"Collection created. Add assets to organise your library."

### Search Saved
"Search saved. Access it from your saved searches."

### Asset Deleted
"Asset deleted from library"

---

## Onboarding Flow

### Welcome Screen
**Headline**: "Find brand assets instantly"

**Body**: "Brandon uses AI to search your library by description. Describe colours, contexts, or subjects—no need to remember exact file names."

**Primary CTA**: "Get started"

**Skip option**: "Skip tutorial"

### Step 1: Natural Search
**Visual**: Example search interface with sample query

**Headline**: "Search naturally"

**Body**: "Type what you need: 'blue gradient background' or 'hero image with electric car'. I understand your brand language."

**Primary CTA**: "Next"

### Step 2: Smart Results
**Visual**: Results grid with relevance indicators

**Headline**: "Get matched results"

**Body**: "Results are ranked by relevance to your description. I search colours, subjects, contexts, and metadata."

**Primary CTA**: "Next"

### Step 3: Quick Actions
**Visual**: Download, share, and collection options

**Headline**: "Download and organise"

**Body**: "Download originals, save to collections, or share searches with your team."

**Primary CTA**: "Start searching"

---

## Form Fields

### Create Collection

**Label**: "Collection name"

**Placeholder**: "Q1 Campaign Assets"

**Helper text**: "Name this collection so you can find it later."

**Character limit**: "50 characters maximum"

### Add Description

**Label**: "Asset description" (optional)

**Placeholder**: "Summer campaign hero image with electric vehicle"

**Helper text**: "Help others find this asset. Describe colours, context, and usage."

### Tag Asset

**Label**: "Tags" (optional)

**Placeholder**: "Add tag"

**Helper text**: "Add keywords to improve search. Separate with commas."

---

## Notifications

### Processing Complete
**Title**: "Assets ready"

**Body**: "12 new assets processed and searchable in your library."

**Action**: "View library"

### Storage Warning
**Title**: "Storage almost full"

**Body**: "85% of storage used. Delete unused files or upgrade for more space."

**Actions**: "Manage storage" / "Dismiss"

### Update Available
**Title**: "Update ready"

**Body**: "New Brandon version available with improved search accuracy."

**Actions**: "Update now" / "Later"

---

## Confirmation Dialogs

### Delete Asset
**Headline**: "Delete this asset?"

**Body**: "This permanently removes the file from your library and all collections. You can't undo this."

**Primary CTA**: "Delete asset"

**Secondary CTA**: "Cancel"

### Delete Collection
**Headline**: "Delete collection?"

**Body**: "This removes the collection but keeps the assets in your library."

**Primary CTA**: "Delete collection"

**Secondary CTA**: "Cancel"

### Sign Out
**Headline**: "Sign out?"

**Body**: "You'll need to sign in again to access your library."

**Primary CTA**: "Sign out"

**Secondary CTA**: "Stay signed in"

---

## Settings Interface

### Account Settings
**Section titles**:
- "Profile"
- "Brand library"
- "Search preferences"
- "Storage"

**Toggle labels**:
- "Show file names in results"
- "Auto-save searches"
- "Email notifications"

### Search Preferences

**Label**: "Default sort order"

**Options**:
- "Most relevant"
- "Newest first"
- "Oldest first"

**Label**: "Results per page"

**Options**: 12, 24, 48

---

## Accessibility Notes

All copy follows these accessibility guidelines:

**Screen reader optimisation**:
- Button labels include context: "Download original file" not just "Download"
- Link text is descriptive: "View brand guidelines" not "Click here"
- Error messages pair with field labels: "Error: Collection name is required"

**Reading level**: 7th-8th grade (general audience)

**Sentence length**: Target 8-14 words for 90-100% comprehension

**Multi-modal communication**:
- Colour indicators paired with text
- Icons have text labels
- Error states show both icon and text message

---

## Tone Adaptation by Context

### Routine tasks (confident users)
- Efficient and minimal
- Example: "Saved" / "Downloaded"

### First use (confused users)
- Patient and explanatory
- Example: "Brandon searches by description. Try 'blue car on mountain road' to see how it works."

### Errors (frustrated users)
- Empathetic and solution-focused
- Example: "Upload failed. File exceeds 50MB. Compress the image or choose a smaller file."

### High-stakes actions (cautious users)
- Serious and transparent
- Example: "Delete this asset? This permanently removes the file from your library and all collections. You can't undo this."

### Achievements (successful users)
- Positive and proportional
- Example: "Collection created. Add assets to organise your library."

---

## Quick Reference

**Button pattern**: [Verb] [object]  
✅ "Download original"  
❌ "Download"

**Error pattern**: [What failed]. [Why]. [What to do].  
✅ "Upload failed. File exceeds 50MB. Compress the image or choose a smaller file."  
❌ "Error: File too large"

**Empty state pattern**: [Explain empty] + [What to do]  
✅ "Nothing matches that description. Try broader terms or check if the asset exists in your library."  
❌ "No results"

**Success pattern**: [Action] [result]  
✅ "Downloaded to your device"  
❌ "Success"

---

## Copy Benchmarks

All copy meets these targets:

- **Buttons**: 2-4 words (6 maximum)
- **Titles**: 3-6 words, 40 characters maximum
- **Error messages**: 12-18 words including solution
- **Notifications**: 10-15 words total
- **Line length**: 40-60 characters for readability
- **Reading level**: 7th-8th grade

---

## Implementation Notes

### Priority 1 (Launch-critical)
- Search input and results
- Error messages (upload, search, auth)
- Empty states
- Primary action buttons

### Priority 2 (Post-launch)
- Onboarding flow
- Success messages
- Notifications
- Collection management

### Priority 3 (Future iterations)
- Settings interface refinements
- Advanced filter copy
- Bulk action confirmations
- Keyboard shortcut hints
