**Automatic Document Filing with Forms**

# **Vision Document**

# **Version 2.1**

# **Revision History**

| Date | Version | Description | Author |
| ----- | ----- | ----- | ----- |
| 29/10/2026 | 2.1 | Restructure Product Features into Group A (Automatic Document Filling, 13 detailed features) and Group B (Work Communication); remove the outdated feature tables; fix section references in the Introduction; detect blank patterns as form fields (A5); keep the original formatting when exporting uploaded templates (A11). | Nguyễn Hữu Phước |
| 27/10/2026 | 2.0 | Revise the content, adjust the scope and terminologies used. Make the vision less vague | Nguyễn Hoàng Thuận Phát |
| 17/10/2026 | 1.0 | Initial document | Nguyễn Hoàng Thuận Phát, Nguyễn Hữu Phước |
|  |  |  |  |
|  |  |  |  |

# **Table of Contents**

1\.	Introduction	[3](#introduction)

1.1	References	[3](#heading=h.fqtuurr8pi0x)

2\.	Positioning	[3](#positioning)

2.1	Problem Statement	[3](#problem-statement)  
2.2	Product Position Statement	[3](#product-position-statement)

3\.	Stakeholder and User Descriptions	[3](#stakeholder-and-user-descriptions)

3.1	Stakeholder Summary	[3](#stakeholder-summary)  
3.2	User Summary	[3](#user-summary)  
3.3	User Environment	[3](#user-environment)  
3.4	Summary of Key Stakeholder or User Needs	[3](#heading=h.i8n9cdj3oxth)  
3.5	Alternatives and Competition	[3](#alternatives-and-competition)

4\.	Product Overview	[3](#heading=h.vttcmga4osz4)

4.1	Product Perspective	[3](#heading=h.4lmdnmo0uqch)  
4.2	Assumptions and Dependencies	[3](#heading=h.k272j3ivh0x6)

5\.	Product Features	[3](#product-features)

6\.	Other Product Requirements	[3](#non-functional-requirements)

# **Vision (Small Project)**

1. # **Introduction** {#introduction}

The purpose of this document is to collect, analyze, and define the high-level needs and features of *Automatic Document Filling with Forms*. *Automatic Document Filling with Forms* is an application that helps organizations produce administrative documents from standard templates. It separates the content of a document from its format: users only fill in the content through guided form fields, while the system handles formatting and generates the complete document. This document focuses on the capabilities needed by the stakeholders and the target users, and on why these needs exist. The details of how *Document: Fill and Deliver* fulfills these needs will be described in the use-case and supplementary specifications.

This document is organized as follows. Section 2 (Positioning) describes the problem being solved and the position of the product. Section 3 (Stakeholder and User Descriptions) identifies the stakeholders and users, their working environment, and the existing alternatives. Section 4 (Product Features) lists the high-level features of the system with their priorities. Section 5 (Non-Functional Requirements) defines the quality attributes and constraints that apply to the product as a whole. The target of the application is to alleviate the burden of formatting in paperworks within organizations. 

2. # **Positioning** {#positioning}

   1. ## **Problem Statement** {#problem-statement}

| The problem of | *drafting administrative documents by copying shared document templates and editing them manually. The editor receives full editing rights over the whole document, including the parts that must remain unchanged, while the instructions on what to write and how to format it are given only through placeholder text and comments. Inefficient communication via 3rd party service while hosting the documents on another 3rd party service.* |
| :---- | :---- |
| affects | *Those who issue document templates for others to complete it, and those in responsible of completing paperworks.* |
| the impact of which is | *incorrectly formatted documents, modified fixed sections, lost instructions, and extra time spent on standardization and revision. Frequent content switching, misused social media for working and regular annoyance.* |
| a successful solution would be | *One in which users are given the permission to edit only where they are supposed to be edited, and edit without needs of formatting. Visual features and fixed content are added automatically, without needs of intervention. Contents are reviewed for validity after drafting, and completed documents are also available in other common formats. Tasks are sent directly to who need to do them, progresses are tracked, and having the communication flow clear.*  |

   2. ## **Product Position Statement** {#product-position-statement}

| For | *Professional and non-professional organization* |
| :---- | :---- |
| Who | *regularly need to produce administrative documents that strictly follow standard templates and formatting rules* |
| The (product name) |  *is a template-based document drafting application, along with task assignment and work communication.*  |
| That | *separates content from format: users fill in guided form fields, and the system generates a complete, correctly formatted document. Organize the communication to be around work relationships, making task assignments clear and easy to follow.*  |
| Unlike | *the current practice of copying document templates with placeholders and comments, or general document assembly tools such as Docassemble and Gavel, which target the document workflow of other fields. The organization’s habit of using social media for communication while using email services to deliver and receive documents.* |
| Our product | *locks the fixed sections of a template, keeps instructions attached to each field, automatically generates the input form from the template, and uses a large language model only to check whether the content follows the instructions, returning short feedback without writing content on behalf of the user. Provide communication channel between those assigning tasks and those who do it, with software-assisted workflow.* |

3. # **Stakeholder and User Descriptions** {#stakeholder-and-user-descriptions}

   1. ## **Stakeholder Summary** {#stakeholder-summary}

| Name | Description | Responsibilities |
| :---- | :---- | :---- |
| Organization administrator | Those oversee the activities | Ensure the documents adhere to the content and visual regulations. Oversee the communication channels, taking proper actions to prevent rule-breaking activities. |
| Development team | The software engineers and IT administrator | Design, implement, deploy and maintain the functionalities of the system. Control the LLM API integration. |

   2. ## **User Summary** {#user-summary}

| Name | Description | Responsibilities | Stakeholder |
| :---- | :---- | :---- | :---- |
| Assignee | The people who have paperworks to do.  | Fill each form following the instructions, review automatic feedback from system and revise their content Export to DOCX/PDF for review and submit to executives. Submission can be done in both the app’s file format or the DOCX / PDF. | Lower managers, lower secretaries, Head of departments, etc. |
| Assigner | The managing executives. They send out document templates and review the received completed one in procedures, while tracking the completion progress. | Upload the template Define fillable fields and locked texts Set clear instructions, verification rules for automatic verification Send tasks to Assignee Review submitted documents | Higher manager, CEO, Higher secretaries, Head of departments, etc. |

   

   3. ## **User Environment** {#user-environment}

The interaction environment is the web, where people can import the file and edit them there, as well as receive and deliver the documents. It is planned to be extended to the desktop environment, which would make the experience smoother. The tasks are office tasks, so it can be assumed that there are no special conditions for them. Microsoft Word is recommended to be used for final verification of exported files, but any DOCX-compatible word processor can be used as a substitute. They are not required during the editing process, just for the final verification step. Alternatively, the user can just export it to PDF format. A task cycle depends on the requirements of the fields. For short or simple requirements, the working time for that field is 1 \- 2 minutes. For long fields, it can take 20 \- 30 minutes to complete, i.e., writing the summary of events or the main part of proposals, during which it may experience discontinuous sessions. At the MVP, we expect single-user editing for a document, but multiple-user collaboration is planned. It also requires a low learning curve for filling out the form for the annual change of executives in charge of documents.

4. ## **Alternatives and Competition** {#alternatives-and-competition}

* Current practice (Google Docs/Drive with Zalo/Messenger): Free and familiar to all users. However, editors have full rights over the whole document, instructions are lost when placeholders and comments are deleted, and tasks are assigned manually through chat messages.  
* Gavel: A specialized and robust tool for automating legal documents. However, it is designed for the legal sector and has a high cost, which makes it unsuitable for student organizations with limited funding.  
* Docassemble: A free, open-source tool that collects data through an interview format and exports documents. However, creating templates requires programming skills (YAML and Python), which makes it unsuitable for general non-technical office users.  
* Microsoft SharePoint structured document generation: The closest alternative. It converts Word templates into forms, suggests fields with AI, and supports conditional sections and DOCX/PDF output. However, form creators need a Microsoft 365 Copilot license, fillers cannot preview the document while filling in the form, it is designed for short data fields rather than long paragraphs, and it does not check whether the content follows the instructions.  
* Government’s document generation tools: Available to be used in their own organization, aren’t published. Ranges from putting text on PDF to generate the whole administrative document based on user’s data.

4. # **Product Features** {#product-features}

The product features are organized into two groups. Group A covers automatic document filling: preparing templates, completing them through guided forms, checking the content and exporting the final document. Group B covers work communication: delivering templates as tasks, submitting, reviewing and tracking documents. In Group A, the template creator is the person who prepares a template and the filler is the person who completes it; when a template is delivered through a task, they act as the Assigner and the Assignee respectively. A filler may also be an individual user working on personal documents without any task.

### *A. Automatic Document Filling*

| No. | Feature | Description | Priority |
| :---- | :---- | :---- | :---- |
| A1 | Built-in Formatting Presets | A preset is a reusable set of formatting rules for a type of document: page layout, document components (such as the national title and motto, the document title and the signature block), fonts, sizes, spacing and writing conventions. The system provides verified built-in presets, starting with the national administrative document format (Decree 30/2020/ND-CP), and can include organization-specific formats such as Youth Union documents. | High |
| A2 | Preset Import and Review | The template creator can create a new preset from a sample DOCX file that already has the desired formatting. Formatting values are read directly from the file, and a large language model is used only to label which paragraph is which document component. Before the preset is saved, a review screen shows the source of every value, flags uncertain values and lists the rules that the system cannot support yet. A new preset can extend an existing one. | Medium |
| A3 | Preset Suggestion from Regulations | The template creator uploads a regulation that describes a formatting standard, and the system suggests preset values, each with a quotation from the regulation as evidence, for review in the same review screen. If the suggestions are not reliable enough, the system only highlights the relevant clauses to help the creator fill in the preset manually. | Low |
| A4 | Template Creation | The template creator prepares a template by generating a formatted skeleton from a preset and a document type, with standard text such as the national title and motto already filled in, or by uploading an existing DOCX template.  Rebuilding an existing document according to a preset, without changing its wording, is planned after the first release. | High |
| A5 | Form Generation | The system turns a template into a fill-in form. It detects fillable fields from markers in the document (such as {{field name}}), from comments, and from blank patterns such as dotted lines, underscores and empty table cells next to a label; for a blank pattern, the text before the blank becomes the field label and the field type is inferred from it. It extracts the instructions attached to each field and locks all fixed text so that fillers cannot edit it. The template creator reviews the result, adjusts the fields and gives each field a type: short text, long text, date, number, amount of money or choice, and marks whether it is required. Ambiguous blanks are proposed as separate fields for the creator to merge; language-model suggestions for such cases are planned for a later phase. | High |
| A6 | Verification Checklist | The template creator turns the requirements of each field into a checklist. Requirements that can be checked exactly, such as length limits and number ranges, become automatic rules (whether a field is required is set in Form Generation and always applies); the remaining requirements are kept as criteria for the content check. The first release supports simple rules and free-text guidance; a larger library of predefined rules is planned later. | High |
| A7 | Test Fill and Template Library | Before a template is used, the template creator fills it in as a filler would and runs the content check, without any data being saved. The finished template is stored in the template library, from which it can be assigned to others through a task or reused by its owner for personal documents. Template version management is planned later. | Low |
| A8 | Guided Form Filling | The filler opens the form from an assigned task or from a personal document. Each field uses an input suited to its type, long fields support minimal rich text (bold, italic, lists), the instructions stay visible next to each field, and a progress indicator shows how much of the form is complete. Later, writing conventions such as dates, amounts of money and document numbers will be normalized automatically while typing. | High |
| A9 | Live Preview and Draft Autosave | A collapsible preview next to the form shows the complete, formatted document while the filler types, and it looks exactly like the exported file. Work in progress is saved automatically, so the filler can continue across several sessions without losing content. | High |
| A10 | Content Check | On request, the system checks the content against the checklist. Automatic rules are checked exactly. The remaining criteria are checked one at a time by a large language model, which must quote the part of the filler's content that a finding about wrong content refers to, or cite the criterion and the field checked for a finding about missing content; when these evidence rules are not met, the result is reported as uncertain. The model only gives short feedback on what is missing or wrong and never writes or rewrites content for the filler. | High |
| A11 | Export to DOCX and PDF | The filler exports the completed document to DOCX or PDF, formatted according to the preset of the template, or keeping the original formatting if the template was uploaded from a DOCX file. Missing required fields or broken automatic rules prevent exporting the final version but still allow exporting a draft; findings of the language model are shown only as warnings. | High |
| A12 | Personal Document Import | A user uploads their own DOCX document and the system generates a form from it in the same way as for templates, so the user can complete it without handling the formatting. Because no template creator has reviewed it, such a document has no approved checklist and its fixed text is not guaranteed to be locked. | Medium |
| A13 | Correction Suggestions | The system suggests small fixes for minor errors only: spelling, typos, punctuation, writing conventions (dates, amounts of money, document numbers) and terminology. Each suggestion is shown as a tracked change that the filler accepts or rejects individually. Suggestions never rephrase sentences; a suggestion that changes a number, date or name is highlighted separately and applied only if the filler accepts it. | Medium |

### *B. Work Communication*

| *No.* | *Feature* | *Description* | *Priority* |
| :---- | :---- | :---- | :---- |
| *B1* | *Task Assignment* | *The Assigner creates a form-based task within an authorized workspace, selects the template, Assignee(s), instructions and deadline. Roles are contextual: a user may receive a Parent Task in one workspace and assign Subtasks in another. Each recipient has an independent Task Assignment and Draft; no shared concurrent editing.* | *Medium* |
| *B2* | *Document Submission* | *Each Submit action creates a new immutable Submission snapshot containing the assigned field values, submitter, time and template version. The Assignee may continue editing the live Draft after submitting, with no lock or need to wait for Request Revision. Review always targets a specific snapshot, not the current Draft.* | *Medium* |
| *B3* | *Deadline Reminders* | *The system reminds Assignees of upcoming deadlines a configurable time before they are due.* | *Low* |
| *B4* | *Progress Tracking* | *The Assigner monitors task and recipient-assignment progress, including independent Subtask status and aggregated approval counts. Completion or approval of Child assignments never automatically submits or approves their Parent Task.* | *Low* |
| *B5* | *Review Feedback* | *The Assigner reviews a specific immutable Submission, records comments, and chooses Approve or Request Revision. Each recipient's submissions and reviews are independent. Revision feedback does not unlock or modify the Draft or previously submitted snapshots.* | *Low* |
| *B6* | *Workspace-based Task Communication* | *Each workspace contains its own members, tasks and task-specific discussions. Comments, feedback and activity records are tied to the authorized task or submission. Access between superior and internal workspaces is restricted; Subtask recipients only see their assignments, delegated fields and explicitly shared read-only context.* | *Medium* |
| *B7* | *Partial Task Delegation* | *An Assignee responsible for a Parent Task can create multiple Subtasks in an internal workspace by choosing any nonempty subset of the Parent Form fields, including all fields. Different Subtasks may overlap in assigned fields; the system warns about overlap without blocking it. Each Subtask may be given to multiple recipients, each with a separate Assignment and Draft.* | *Medium* |
| *B8* | *Independent Assignment and Submission Management* | *For a Subtask assigned to several Assignees, the system maintains separate Drafts, immutable Submission histories and reviews per recipient. No shared Draft or concurrent editing is used. The Subtask displays aggregate progress without merging submissions or granting recipients access to each other's work.* | *Medium* |
| *B9* | *Manual Subtask Result Integration* | *The Parent Assignee can compare approved Subtask submissions, select, combine, rewrite or ignore contributed field values, and edit all authorized Parent Draft fields. An Apply-to-field action warns before overwriting data and records source and change history. No automatic merge or synchronization is performed; the Parent is submitted separately.* | *Medium* |
| *B10* | *Task-scoped Access and Responsibility* | *Assigner and Assignee are roles within a task relationship, not permanent account types. A Parent Assignee remains accountable for the Parent deliverable even when delegating fields. Permissions control workspace visibility, recipient-specific Draft access, and authorized review; a Child approval does not automatically complete the Parent.* | *Medium* |

5. # **Non-Functional Requirements** {#non-functional-requirements}

Platform: Work on any modern web browsers. Should be compatible with existing file formats in both import and export.

Performance: LLM answer should be short and straightforward to conserve resources. User input must be saved in reliable storage to preserve data. Synchronization should happen in parallel with the user’s action (non-blocking)

Storage: Both online and offline storage are required to deal with network loss. Data should persist to those with responsibility in the organization even if the roles change; e.g., later heads should see the work of the previous one without using the same account. The app should not be hosted on a cloud service, but instead be deployable on local machines, using a local database. 3rd party account authentication, i.e., via Google Accounts, is acceptable.
