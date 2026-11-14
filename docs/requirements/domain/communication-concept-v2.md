# **COMMUNICATION CONCEPT — VERSION 2**

CS300 · Document: Fill and Deliver · 28/10/2026

Trạng thái: Bản thiết kế concept để nhóm review. Căn cứ: Vision Document v2.0 và biên bản họp trực tuyến 26/10/2026 (bản đã cập nhật). Các quy tắc kỹ thuật dưới đây là phương án đề xuất, chưa mặc định là quyết định chính thức.

# **1\. Mục tiêu và phạm vi**

Mục tiêu: tổ chức việc giao – nhận – thực hiện – nộp – review văn bản giữa các bên trong một tổ chức; giảm việc phân tán task, file và phản hồi qua nhiều nền tảng. Communication gắn với nhiệm vụ và tài liệu, không nhằm thay thế chat tổng quát.

Phạm vi bản này: quan hệ Assigner/Assignee; workspace theo ngữ cảnh làm việc; giao tiếp theo task; ủy quyền công việc sang workspace kế tiếp (parent–child task); quản lý draft, submission snapshot, review và quyền truy cập. Không mô tả chi tiết thuật toán sinh form, xử lý DOCX hay LLM verification.

# **2\. Nền tảng nghiệp vụ: Assigner và Assignee**

Assigner: bên giao nhiệm vụ, xác định template, yêu cầu, thời hạn, tiếp nhận bản nộp và review. Assignee: bên nhận trách nhiệm hoàn thành nhiệm vụ, soạn draft, nộp và sửa theo phản hồi.

Assigner và Assignee là vai trò trong quan hệ giao việc, không phải loại tài khoản cố định. Một người có thể là Assignee ở workspace cấp trên và Assigner trong workspace nội bộ.

Nguyên tắc trách nhiệm: đối với mỗi task, Assignee được ghi nhận phải chịu trách nhiệm cho kết quả được nộp cho Assigner của task đó, bất kể là tự làm hay phân nhiệm vụ cho các Assigner trong một quan hệ khác.

# **3\. Workspace và mô hình hai tầng**

Workspace là không gian làm việc có danh sách người tham gia, task và lịch sử trao đổi riêng. Mỗi workspace có ngữ cảnh giao–nhận việc xác định, và tương ứng với mối quan hệ giao \- nhận việc đó.

Ví dụ A — Workspace dọc: Tổ chức giao báo cáo tháng 10 cho các đại diện bộ phận. Đối với từng task, bên tổ chức là Assigner và đại diện bộ phận tương ứng là Assignee.

Ví dụ B — Workspace ngang: đại diện bộ phận A nhận Parent Task \#100, sau đó tạo Subtask \#101 trong workspace nội bộ để giao một số field cho thành viên X và Y. Đại diện bộ phận là Assigner của Subtask; X và Y là các Assignee làm trên những bản riêng.

Hai workspace lưu nội dung giao tiếp riêng, mặc định chỉ có thể được nhìn thấy bởi tài khoản quản trị viên và các thành viên của workspace.

# **4\. Parent–Child Task Delegation**

## **4.1. Định nghĩa và dữ liệu**

Parent Task chứa form với tập field F. Subtask là một phần việc được phân rã từ Parent Task, được xác định bởi tập field S không rỗng với S ⊆ F. S có thể bằng toàn bộ F. Một Parent Task có thể tạo nhiều Subtask; mỗi Subtask tham chiếu parent\_task\_id và danh sách delegated\_field\_ids.

Assignee của Parent Task là người tạo Subtask trong workspace nội bộ và trở thành Assigner của Subtask. Trách nhiệm hoàn thành và nộp Parent Task cho cấp trên vẫn thuộc Assignee của Parent Task, không chuyển sang những người thực hiện Subtask.

Một Subtask được giao cho một hoặc nhiều người thông qua các Task Assignment riêng. Mỗi Assignment có Assignee, Draft, Submission Snapshot, Review và tiến độ riêng. Không có Draft dùng chung hoặc concurrent editing. Tiến độ Subtask được tổng hợp từ các Assignment (ví dụ: 1/2 Assignment đã được duyệt).

## **4.2. Tạo và giao Subtask**

B1. Người phụ trách Parent Task mở Parent Form và chọn “Tạo Subtask”.

B2. Đặt tên Subtask và chọn một hoặc nhiều field thuộc phạm vi có thể điền của Parent Form. Hệ thống hiển thị tên, yêu cầu và hướng dẫn của từng field; không cho chọn field nằm ngoài Parent Task.

B3. Chọn một hoặc nhiều Assignee trong workspace nội bộ, nhập yêu cầu bổ sung và deadline. Hệ thống có thể cung cấp các field liên quan ở chế độ chỉ đọc nếu cần làm rõ ngữ cảnh và có quyền chia sẻ.

B4. Xác nhận: hệ thống tạo một Subtask và một Task Assignment độc lập cho mỗi người nhận; mỗi Assignment khởi tạo một Draft chỉ cho phép điền các field đã chọn. Người nhận không mặc nhiên có quyền đọc Parent Task hay bản làm việc của người khác.

B5. Việc tạo Subtask không sửa Parent Draft, không đổi trạng thái hay deadline của Parent Task. Deadline Subtask nên sớm hơn hoặc bằng deadline Parent; nếu vượt hạn cần hiển thị cảnh báo.

## **4.3. Nộp bài, review và tổng hợp kết quả**

B1. Mỗi Assignee điền Draft của Assignment riêng và Submit. Mỗi lần Submit tạo một Submission Snapshot bất biến, lưu đúng những field được giao và gắn với người nộp/Assignment. Các Assignee có thể hoàn thành ở thời điểm khác nhau.

B2. Assigner của Subtask review từng Submission độc lập: Approve hoặc Request Revision. Nếu cần sửa, người tương ứng chỉnh Draft riêng và nộp snapshot mới; những snapshot trước được giữ nguyên. 

B3. Assignee của Parent Task xem các kết quả Subtask đã được duyệt, chọn nội dung phù hợp, kết hợp thông tin hoặc tự viết lại các field trong Parent Draft. Người này có toàn quyền biên tập những field được phép ở Parent Task; kết quả Subtask là đầu vào tham khảo, không bắt buộc áp dụng nguyên văn.

B4. Khi dùng thao tác “Áp dụng vào field”, chỉ cập nhật field mục tiêu trong Parent Draft, cảnh báo trước khi ghi đè dữ liệu hiện có và ghi lịch sử nguồn (submission\_id, field\_id, người áp dụng, thời điểm). Nếu tự tổng hợp thủ công, có thể liên kết các nguồn tham khảo trong lịch sử; không chỉnh sửa Submission gốc.

B5. Sau khi hoàn thiện Parent Draft, Assignee của Parent Task Submit để tạo Parent Submission riêng cho bên tổ chức review. Dù tất cả Subtask đã Approved, Parent Task không tự động được Submitted hoặc Approved.

## **4.4. Quy tắc field overlap và xử lý xung đột**

Cho phép các Subtask cùng Parent Task chọn trùng field. Ví dụ: Subtask \#101 giao F2 và F4 cho X, Subtask \#102 giao F3 và F4 cho Y; cả X và Y đều nộp nội dung F4 riêng. Hệ thống không áp đặt ràng buộc disjoint giữa tập field của các Subtask.

Trong giao diện “Tạo Subtask”, nếu một field đã được giao ở Subtask khác, hệ thống hiển thị cảnh báo và danh sách Subtask liên quan nhưng vẫn cho phép chọn.

Các Draft/Submission tiếp tục độc lập. Hệ thống không tự hợp nhất, tự ưu tiên hoặc tự ghi đè các giá trị của field bị overlap. Assignee của Parent Task xem các kết quả cạnh nhau để chọn một bản, kết hợp thông tin hoặc viết lại trong Parent Draft.

## **4.5. Giới hạn thực hiện trong MVP**

Hỗ trợ tạo nhiều Subtask từ một Parent; lựa chọn tập field bất kỳ không rỗng (kể cả toàn bộ field); cho phép field overlap; giao một Subtask cho nhiều Assignee với Draft/Submission độc lập; review từng Assignment; tổng hợp thủ công vào Parent Draft. Không triển khai Shared Draft, concurrent editing, automatic merge hay ủy quyền chuyển tiếp qua nhiều cấp.

# **5\. Tách Task — Draft — Submission — Review**

## **5.1. Task**

Task ghi nhận ID, workspace, assigner, parent\_task\_id, template version, deadline và trạng thái. Subtask bổ sung delegated\_field\_ids và danh sách Task Assignment. Mỗi Task Assignment gắn một Assignee, Draft, lịch sử Submission/Review và tiến độ riêng; không đồng nhất nhiều Assignee với một bản làm việc chung.

## **5.2. Draft**

Draft là dữ liệu đang soạn theo field và version. Parent Draft do Assignee của Parent kiểm soát và có thể tự chỉnh sửa mọi field được phép của Parent Task. Mỗi Assignee của Subtask có Draft riêng chỉ gồm những field được giao. Autosave không đồng nghĩa Submit; không có concurrent editing.

## **5.3. Submission Snapshot**

Mỗi lần một Assignee Submit, hệ thống tạo Submission Snapshot mới gắn task\_id, assignment\_id, người nộp, thời gian, version, tập field được giao, giá trị các field và template/preset version. Snapshot bất biến, ngay cả khi người phụ trách Parent biên tập lại nội dung từ đó.

Hai Submission của cùng một assignment là hai bản độc lập; hai Assignee trên cùng Subtask cũng nộp những snapshot riêng. Review luôn tham chiếu submission\_id cụ thể, không review live draft.

Submit chỉ tạo một Submission Snapshot bất biến từ nội dung Draft tại thời điểm nộp. Sau Submit, Draft vẫn được chỉnh sửa và lưu bình thường, không bị khóa và không cần chờ Request Revision. Những thay đổi về sau trên Draft không ảnh hưởng bất kỳ Submission nào đã tạo. Review chỉ dựa trên Submission được chọn, không dựa trên Draft hiện tại.

## **5.4. Review**

Assigner review riêng mỗi Submission, chọn Approve hoặc Request Revision và ghi nhận xét. Dù có hay không có yêu cầu chỉnh sửa, Assignee vẫn có thể tiếp tục soạn Draft và Submit một snapshot mới; Request Revision là kết quả review của một Submission, không phải thao tác mở khóa Draft. Việc duyệt một assignment không đồng nghĩa duyệt mọi assignment của Subtask, và không tự hoàn thành Parent.

# **6\. Tổng hợp kết quả Subtask vào Parent Draft**

Đại diện bộ phận (Assignee của Parent, Assigner của Subtask) có toàn quyền biên tập các field được phép trong Parent Draft. Kết quả Submission đã được duyệt là nguồn để tham khảo, chọn, sao chép, kết hợp hoặc viết lại; thao tác tổng hợp không sửa Submission nguồn.

Không sử dụng full-document replacement. UI có thể hỗ trợ “Áp dụng vào field” để chèn giá trị từ một Submission vào field tương ứng, hoặc để đại diện tự nhập/tổng hợp. Khi Subtask A và B cùng đóng góp field F2, hệ thống hiển thị từng kết quả riêng để lựa chọn hoặc biên tập thủ công; không auto-merge. Cảnh báo trước khi ghi đè field Parent đã có dữ liệu và kiểm tra draft version.

Khi Apply trực tiếp, ghi source\_submission\_id, target\_field\_id, applied\_by, applied\_at, phiên bản Parent Draft sau cập nhật. Khi đại diện tự viết lại hoặc kết hợp nhiều nguồn, có thể ghi nhận các Submission tham khảo trong activity/history; không bắt buộc mọi ký tự trong Parent Draft truy ngược tới một snapshot. Submission mới từ Child không tự ghi đè Parent.

Nộp Subtask và nộp Parent là hai hành động riêng. Thành viên gửi kết quả cho đại diện; đại diện tổng hợp, chỉnh sửa và nộp Parent Submission cho tổ chức. Tổ chức chỉ review Parent Submission chính thức.

# **7\. Communication và Visibility**

Mỗi task có task discussion riêng phục vụ hỏi đáp yêu cầu, cập nhật, review feedback và activity history. Message và comment phải gắn task\_id và người gửi; Review feedback cần gắn submission\_id.

Quy tắc mặc định: người nhận Subtask chỉ được chỉnh sửa tập field được giao trên Draft riêng của mình. Có thể cung cấp field/hướng dẫn liên quan ở chế độ read-only nếu được chia sẻ rõ ràng. Không tự động trao quyền truy cập Parent Task hoặc các Subtask khác; thông tin giữa workspace chỉ đi qua luồng chia sẻ/nộp được cấp phép.

Trong ví dụ: tổ chức xem Parent Task \#100 và Submission gửi lên; đại diện bộ phận quản lý Parent Draft, các Subtask và mọi Submission nội bộ; X và Y chỉ xem phạm vi được cấp và Draft/Submission của bản thân. Quyền quản trị workspace được kiểm tra riêng, không tạo vai trò nghiệp vụ thứ ba.

# **8\. Task Status và sự kiện**

Mỗi Task Assignment có lifecycle riêng: ASSIGNED → IN\_PROGRESS → SUBMITTED → APPROVED hoặc SUBMITTED → REVISION\_NEEDED → IN\_PROGRESS → SUBMITTED. Subtask có thể hiển thị tiến độ tổng hợp n/m assignment đã approved; Parent Task vẫn độc lập.

Sự kiện tối thiểu: TaskAssigned, SubtaskCreated, AssignmentCreated, DraftSaved, SubmissionCreated, RevisionRequested, SubmissionApproved, SubmissionAppliedToParentField, ParentDraftEdited, TaskCancelled. Mỗi sự kiện lưu actor, thời điểm và các ID liên quan.

Khi một hoặc nhiều Subtask Submission được duyệt, Parent Task không tự đổi status; người phụ trách Parent được thông báo có kết quả để sử dụng. Khi Parent bị trả revision, người phụ trách có thể tự sửa hoặc giao công việc mới theo quyết định D5; không sửa snapshot đã duyệt.

# **9\. Ranh giới MVP và không thực hiện**

MVP gồm: Assigner/Assignee theo ngữ cảnh; workspace; Parent Form; tạo nhiều Subtask với subset field (có thể là toàn bộ field); giao một Subtask cho một/nhiều người với Draft/Submission tách biệt; review từng snapshot; tổng hợp thủ công vào Parent Draft. Không gồm: concurrent/shared draft, tự merge field, auto-sync hai chiều, ủy quyền chuyển tiếp không giới hạn, chat chung kiểu Discord. Chính sách field overlap đã chốt theo phương án B tại mục 4.4.

# **10\. Invariants và tiêu chí nghiệm thu**

I1. Mỗi Submission là bất biến; mọi review gắn một submission\_id cụ thể.

I2. Child Task có trạng thái và lịch sử riêng; Child Approved không đồng nghĩa Parent Submitted hoặc Approved.

I3. Assignee của Parent có toàn quyền chỉnh sửa, thay thế, tổng hợp hoặc bỏ qua nội dung đóng góp trong các field Parent được phép chỉnh. Submission nguồn vẫn bất biến; thao tác Apply có cấu trúc phải lưu nguồn và lịch sử.

I4. Không có quyền truy cập chéo workspace.

I5. Người chịu trách nhiệm nộp Parent vẫn là Assignee của Parent Task.

Kiểm thử: Subtask chỉ chứa field đã chọn; X/Y nhận Draft riêng và nộp snapshot riêng; thay đổi của X không tác động Y; review từng assignment độc lập; các Subtask có thể cùng đóng góp F2 theo chính sách overlap; người phụ trách Parent tổng hợp và sửa F2; Parent không tự đổi trạng thái; Submission nguồn bất biến; chặn ghi ngoài field được giao.

# **11\. Các quyết định nhóm cần xác nhận**

D1. Workspace membership: quản trị viên tạo workspace; Assigner quản lý thành viên. Hai workspace được liên hệ thông qua cùng một người là Assignee ở workspace cấp trên và Assigner ở workspace cấp dưới. Cần đặc tả thêm cơ chế xác thực mối liên hệ và quyền quản trị.

D2. Một task giao cho một Assignee hay nhiều Assignee? Đề xuất MVP: một task \= một Assignee; giao cho nhiều người tạo nhiều assignment/task riêng. Một task \=\> Nhiều assignee, nhưng tuỳ chọn assignment / delegation (Nộp bản copy / Làm trên bản gốc)

D3. Số Subtask: một Parent có thể tạo không giới hạn Subtask (theo quyết định hiện tại); hệ thống cần hiển thị và lọc danh sách để tránh khó quản lý.

D4. Quy tắc hủy task, đổi người phụ trách, deadline quá hạn và chuyển giao khi thành viên rời tổ chức.

D5. Khi Parent bị yêu cầu sửa sau khi Subtask đã approved: người phụ trách Parent có thể tự sửa hoặc tạo công việc mới để giao lại; không mở khóa hay sửa Submission cũ.

# **12\. Tài liệu tham chiếu**

Vision Document v2.0: [https\://docs.google.com/document/d/1hoTf7ywX2RC45Elr-C0kOwtSxxqMD3sRJrBFf7CKSos/edi](https://docs.google.com/document/d/1hoTf7ywX2RC45Elr-C0kOwtSxxqMD3sRJrBFf7CKSos/edit)t

Online Meeting 26/10 (revised): [https\://docs.google.com/document/d/1qqjwBWJVESON0PdnXqhY1-zlPqeZC2ScBXNnwnSjEVc/edi](https://docs.google.com/document/d/1qqjwBWJVESON0PdnXqhY1-zlPqeZC2ScBXNnwnSjEVc/edit)t

Communication Concept v1 (historical only): [https\://docs.google.com/document/d/1y\_EV7MSHyauUOz6PbZv5pg3f0-z10OwJYW8J2QV4J\_4/edi](https://docs.google.com/document/d/1y_EV7MSHyauUOz6PbZv5pg3f0-z10OwJYW8J2QV4J_4/edit)t
