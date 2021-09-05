// ==UserScript==
// @name         HumorUnivBestAssist
// @namespace    http://humoruniv.com/
// @version      0.1.5
// @author       KKM
// @description  이 스크립트는 웃긴대학 주간답글 베스트 작성을 도와주기 위한 목적으로 작성되었습니다.
// @description  이 스크립트를 수정해서 다른 악의적인 용도로 수정해서 배포시 법적 문제가 생길 수 있습니다.
// @description  이 스크립트는 크롬의 Tampermonkey 확장프로그램에서 실행될 수 있습니다.
// @description  이 스크립트는 개인적인 목적으로 사용시 수정하여 사용할 수 있지만 수정된 스크립트를 배포 할 수 없습니다.
// @description  이 스크립트를 사용하시는 분들은 반드시 배포하는 곳에서만 받아주세요.
// @description  스크립트 공식 배포처 : https://github.com/kkm3/HumorUnivBestAssist
// @updateURL    https://github.com/kkm3/HumorUnivBestAssist/raw/main/HumorUnivBestAssist.user.js
// @match        http://m.humoruniv.com/board/read.html?*
// @grant        GM_setValue
// @grant        GM_getValue
// @require      https://code.jquery.com/jquery-migrate-1.4.1.js
// ==/UserScript==

// * 업데이트 기록
//
// 2021-09-05 v0.1.5
// - 너굴맨이 설정된 경우 HTML 구조가 다르면 제대로 너굴맨이 선택되지 않던 문제 수정
//
// 2021-09-04 v0.1.4
// - '댓글 내용 굵게' 설정시 모든 댓글의 색상이 붉은색으로 변경되는 문제 수정
// - 설정창에서 '댓글 내용 굵게' 옵션을 체크/체크해제 변경시 적용 버그 수정
// - 설정창의 체크박스 UX 편의성 개선
//
// 2021-07-25 v0.1.3
// - 제목이 긴 경우 오른쪽 워터마크 자리까지 길게 나오는데 줄바꿈 되도록 수정
//
// 2021-07-08 v0.1.2
// - github을 이용한 자동업데이트 추가
//   HTML구조 변경시 광고나 버튼 제거 안될 경우 수정한 버전을 다시 받아야 하는데, Tampermonkey에서 업데이트로 수정 가능
//
// 2021-07-05 v0.1.1
// - 중단 광고 제거 추가
// - 댓글 내용 굵게 옵션 추가
//

var IS_INIT = false;

// 삭제될 오브젝트들
var HUBA = {
    // 삭제할 오브젝트들 (비표시)
    _xpath_removes : [
        '//*[@id="navi"]',// [상단] 네비게이션
        '//*[@id="pnut_iframe"]',// 상단 광고
        //'//*[@id="read_subject_div"]/table/tbody/tr/td[2]',// [상단] ▲ 버튼 (제목이 긴 경우 오른쪽 빈공간 유지를 위해 제거 처리하지 않음)
        '//*[@id="read_subject_div"]/table/tbody/tr/td[3]',// [상단] 맨밑 버튼
        '//*[@id="read_subject_div"]/table/tbody/tr/td[4]',// [상단] ▼ 버튼
        '//*[@id="content_info"]/table/tbody/tr/td[1]/table/tbody/tr/td[3]/a/span[2]',// 닉네임의 아바타/쪽지/글검색 텍스트
        '//*[@id="content_info"]/table/tbody/tr/td[1]/table/tbody/tr/td[3]/a/img',// 닉네임의 아바타/쪽지/글검색 아이콘
        '//*[@id="content_info"]/table/tbody/tr/td[1]/div[1]',// [상단] 추천/단축URL 버튼
        '//*[@id="read_ok_desc_div"]',// [게시물 하단] 추천버튼
        '//*[@id="naver_adpost_wrap_fix"]',// [중단] 광고 #1
        '//*[@id="read_menu_btn_div"]',// [중단] 추천/반대/답글/목록/뒤로/맨위/맨밑/신고/스크랩 버튼들
        '//*[@id="next_prev"]',// [중단] 게시물 이전/다음 네비게이션
        '//*[@id="main_list_best"]',// [중단/하단] 웃긴자료 베스트 & 인공지능 추천 인기자료
        'div[style*="min-height: 100px"]',// [중단] 광고 #3 : 2021-07-05 추가
        '//*[@id="comment"]/ul/div[2]',// [중단] 광고 #2
        '.recomm_btn',// [하단] 댓글 중 '추천' 버튼들
        '.btn_move',// [하단] 베스트 댓글 중 '이동' 버튼
        '#comment > ul > li:contains(\'삭제된 답글입니다.\')',// [하단] 댓글 중 '삭제된 댓글'
        '#comment > ul > li:contains(\'웃긴자료 게시판으로 이동되었습니다\')',// [하단] 댓글 중 '웃긴자료 이동 공지'
        '//*[@id="comment"]/ul/table',// [하단] 광고 #3
        '#comm_write',// [하단] 답글 작성하기 버튼
        '//*[@id="comm_write"]',// [하단] 답글 작성 폼
        '//*[@id="footer"]'// [하단] 푸터(이용약관 등) 내용
    ],

    // 수정 처리될 오브젝트들
    _xpath_modify : [
        ['#read_top_prev', 'visibility:hidden; width:130px;', 'replace'],// 제목 오른쪽 빈공간 유지
        ['//*[@id="read_subject_div"]/table/tbody/tr/td[1]/h2', 'text-align:left; font-weight:bold;', 'replace'],// 게시물 제목 스타일
        ['//*[@id="content_info"]/table/tbody/tr', 'height:98px;', 'replace']// 작성자 정보 스타일
    ],

    // 유저 선택에 따라 처리될 오브젝트들 (이미지, 내용, 댓글 등)
    _is_display_contents : Number(GM_getValue('default_display_contents', 0)),
    _xpath_contents : [
        'wrap_copy > div[id^="racy_show"]',// 너굴맨 블럭
        'wrap_copy > *[id!="racy_show"][class!="body_editor"]',// 너굴맨 블럭이 아니고, 에디터 블럭이 아닌 기타 문단들
        'wrap_copy > div[class="body_editor"] > div[id!="racy_show"]',// 내용이 에디터 블럭으로 묶인 경우, 에디터 내 문단들(너굴맨 블럭 제외)
        '//*[@id="wrap_copy"]/table | //*[@id="wrap_copy"]/p'// 게시물 내 문단 #2 GIF/텍스트
    ],

    // 베스트 댓글
    _is_display_bestreply : Number(GM_getValue('default_display_bestreply', 0)),
    _xpath_bestreply : [
        '.comment_best_wrap',// 베스트 댓글 테이블
    ],

    // 일반 댓글
    _is_display_reply : Number(GM_getValue('default_display_reply', 0)),
    _xpath_reply : [
        '#comment > ul > li'// 댓글
    ],

    // 댓글 내용 굵게 옵션
	_is_reply_bold : Number(GM_getValue('default_reply_bold', 0)),
    _xpath_reply_bold : [
        ['.comment_body', 'font-weight:bold;', 'add']
    ],

    _hide_reply_recomm_count : Number(GM_getValue('default_hide_reply_recomm_counts', 10)),

    _obj_removes : null,
    _obj_modify : null,
    _obj_contents : null,
    _obj_bestreply : null,
    _obj_reply : null,
    _obj_reply_bold : null,

    // }}}
    // {{{

    initialize : function()
    {
        // add style
        $(document.head).append('<style type="text/css">\n'
                                +'.HUBA_disabled { background-color:rgba(255, 0, 0, 0.2) !important; border:solid 2px red; }\n'
                                +'.HUBA_disabled * { pointer-events:none; }\n'
                                +'.HUBA_enabled { background-color:rgba(0, 0, 255, 0.2) !important; border:solid 2px blue; }\n'
                                +'.HUBA_enabled * { pointer-events:none; }\n'
                                +'.HUBA_remove { display:none !important; }\n'
                                +'.HUBA_hide { display:none !important; }\n'
                                +'.HUBA_Controller { display:none; position:fixed; right:0px; top:50px; width:230px; background-color:rgba(255, 255, 255, 0.95); border:solid 1px #303030; text-align:left; }\n'
                                +'.HUBA_Controller li { margin:2px; padding:2px; }\n'
                                +'.HUBA_Controller div { margin:2px; padding:5px; text-align:center; }\n'
                                +'.HUBAbtn { padding:4px; }\n'
                                +'</style>');

        // debug panel
        $(document.body).append('<div id="Dbg" style="align:left;"></div>');

        // control panel
        $(document.body).append('<div id="HUBAController" class="HUBA_Controller">'
                                +'<div style="background-color:#DDD"><b>기본 설정</b></div><ul>'
                                +'<li><font style="color:red">비활성화</font> 할 항목이 많을 경우 사용합니다.<br>'
                                +'글 열람시 자동 적용되며 일괄적으로 <font style="color:blue">활성화</font>/<font style="color:red">비활성화</font> 여부를 설정 합니다.<br>'
                                +'개별 선택 후 <b>[보기]</b> 버튼을 누르면 <font style="color:red">비활성화</font>로 선택된 항목은 감춤 처리 됩니다.</li>'
                                +'<li><label for="HUBAoptContEnable" style="cursor:pointer"><input id="HUBAoptContEnable" type="checkbox" value="1" '+ ((this._is_display_contents == true) ? 'checked' : '') +'> 내용 기본 비활성화</label></li>'
                                +'<li><label for="HUBAoptBestReplyEnable" style="cursor:pointer"><input id="HUBAoptBestReplyEnable" type="checkbox" value="1" '+ ((this._is_display_bestreply == true) ? 'checked' : '') +'> 베스트댓글 기본 비활성화</label></li>'
                                +'<li><label for="HUBAoptReplyEnable" style="cursor:pointer"><input id="HUBAoptReplyEnable" type="checkbox" value="1" '+ ((this._is_display_reply == true) ? 'checked' : '') +'> 댓글 자동으로 비활성화</label></li>'
                                +'<li>댓글 추천 <input id="HUBAoptReplyLimit" type="text" value="'+ this._hide_reply_recomm_count +'" style="width:30px"><b>이하</b> 비활성화</li>'
                                +'<li>댓글 비추천 <input id="HUBAoptReplyLimit" type="text" value="'+ this._hide_reply_recomm_count +'" style="width:30px"><b>이상</b> 비활성화</li>'
                                +'<li><label for="HUBAoptReplyBold" style="cursor:pointer"><input id="HUBAoptReplyBold" type="checkbox" value="1" '+ ((this._is_reply_bold == true) ? 'checked' : '') +'> 댓글 내용 굵게</label></li>'
								+'</ul>'
                                +'<div style="border-bottom:solid 1px #303030"><button id="HUBAbtnSaveAndApply" class="HUBAbtn"> 설정 저장 및 적용 </button></div>'
                                +'<div><button id="HUBAbtnApply" class="HUBAbtn">&nbsp; 적용 &nbsp;</button> &nbsp;'
                                +'<button id="HUBAbtnReset" class="HUBAbtn">&nbsp; 초기화 &nbsp;</button> &nbsp;'
                                +'<button id="HUBAbtnClose" class="HUBAbtn">&nbsp; 창닫기 &nbsp;</button></div>'
                                +'</div>');

        // 컨트롤 패널 버튼 이벤트
        var btn = $('<button id="HUBAbtnOpen" class="HUBAbtn">  설정 열기  </button>').click(handlerOpenControlPanel);
        $('#ddn_ad_128').attr('style', '').html('').append(btn);
        $('#HUBAbtnSaveAndApply').click(handlerSaveAndApply);
        $('#HUBAbtnApply').click(handlerApply);
        $('#HUBAbtnReset').click(handlerReset);
        $('#HUBAbtnClose').click(handlerCloseControlPanel);

        //var a = getElementsByXPath(this._xpath_contents);

        this._obj_removes = getElementsByXPath(this._xpath_removes);
        this._obj_modify = getElementsByXPath(this._xpath_modify);
        this._obj_contents = getElementsByXPath(this._xpath_contents);
        this._obj_bestreply = getElementsByXPath(this._xpath_bestreply);
        this._obj_reply = getElementsByXPath(this._xpath_reply);
        this._obj_reply_bold = getElementsByXPath(this._xpath_reply_bold);

        initElementStyle(this._obj_modify, this._xpath_modify);
        initElementStyle(this._obj_reply_bold, this._xpath_reply_bold);
    }
};

// 설정 버튼 핸들러
function handlerOpenControlPanel()
{
    showGuide();

    // 설정창 열기
    $('#HUBAController').toggle();
}

// 설정 화면 표시
function showGuide()
{
    if ( ! IS_INIT)
    {
        // 내용 오브젝트 기본 값 처리
        initElementsStatus(HUBA._obj_contents, HUBA._is_display_contents);// 선택 상태 초기화
        initElementsStatus(HUBA._obj_bestreply, HUBA._is_display_bestreply);// 선택 상태 초기화
        initElementsStatus(HUBA._obj_reply, HUBA._is_display_reply);// 선택 상태 초기화

        IS_INIT = true;
    }
    else
    {
        addClassToElements(HUBA._obj_contents, 'HUBA_enabled');
        addClassToElements(HUBA._obj_bestreply, 'HUBA_enabled');
        addClassToElements(HUBA._obj_reply, 'HUBA_enabled');
        removeClassToElements('.HUBA_hide', 'HUBA_enabled');
        addClassToElements('.HUBA_hide', 'HUBA_disabled');
    }

    toggleModifyStyle(HUBA._obj_modify, "OLD");
    toggleModifyStyle(HUBA._obj_reply_bold, "OLD");

    addEventToElements(HUBA._obj_contents, handlerToggleDisplay);// 이벤트 추가
    addEventToElements(HUBA._obj_bestreply, handlerToggleDisplay);// 이벤트 추가
    addEventToElements(HUBA._obj_reply, handlerToggleDisplay);// 이벤트 추가

    // 삭제 할 오브젝트 숨김처리
    removeClassToElements(HUBA._obj_removes, 'HUBA_remove');

    // 감춰진 오브젝트들 해제 (다시 선택 가능하도록)
    removeClassToElements('.HUBA_hide', 'HUBA_hide');
}

// 설정 화면 숨김
function hideGuide()
{
    // 제거될 오브젝트 처리
    addClassToElements(HUBA._obj_removes, 'HUBA_remove');

    // 내용 오브젝트 처리,
    removeEventToElements(HUBA._obj_contents, handlerToggleDisplay);// 이벤트 제거
    removeEventToElements(HUBA._obj_bestreply, handlerToggleDisplay);// 이벤트 추가
    removeEventToElements(HUBA._obj_reply, handlerToggleDisplay);// 이벤트 추가

    // 스타일 수정 오브젝트 처리
    toggleModifyStyle(HUBA._obj_modify, "NEW");

    if ($('#HUBAoptReplyBold').is(':checked') == true)
        toggleModifyStyle(HUBA._obj_reply_bold, "NEW");
    else
        toggleModifyStyle(HUBA._obj_reply_bold, "OLD");

    // 선택한 오브젝트 처리
    addClassToElements('.HUBA_disabled', 'HUBA_hide');
    removeClassToElements('.HUBA_enabled', 'HUBA_enabled');
}

function handlerCloseControlPanel()
{
    // 설정창 열기
    $('#HUBAController').toggle();
}

// 옵션 적용
function handlerSaveAndApply()
{
    // 기본값 변경
    HUBA._is_display_contents = $('#HUBAoptContEnable').is(':checked') == true;
    GM_setValue('default_display_contents', HUBA._is_display_contents);

    HUBA._is_display_bestreply = $('#HUBAoptBestReplyEnable').is(':checked') == true;
    GM_setValue('default_display_bestreplay', HUBA._is_display_bestreply);

    HUBA._is_display_reply = $('#HUBAoptReplyEnable').is(':checked') == true;
    GM_setValue('default_display_reply', HUBA._is_display_reply);

    HUBA._is_reply_bold = $('#HUBAoptReplyBold').is(':checked') == true;
    GM_setValue('default_reply_bold', HUBA._is_reply_bold);

    HUBA._hide_reply_recomm_count = (Number($('#HUBAoptReplyLimit').val()) > 0) ? Number($('#HUBAoptReplyLimit').val()) : 0;
    GM_setValue('default_hide_reply_recomm_counts', HUBA._hide_reply_recomm_count);

    hideGuide()
}

// 보기 표시/미표시 실행
function handlerApply()
{
    // 설정대로 오브젝트들 처리
    hideGuide()

    // 설정창 닫기
    $('#HUBAController').toggle();
}

// 상태 초기화
function handlerReset()
{
    removeClassToElements('.HUBA_remove', 'HUBA_remove');
    removeClassToElements('.HUBA_hide', 'HUBA_hide');
    removeClassToElements('.HUBA_disabled', 'HUBA_enabled');
    removeClassToElements('.HUBA_disabled', 'HUBA_disabled');
    removeClassToElements('.HUBA_disabled', 'HUBA_hide');
    removeClassToElements('.HUBA_enabled', 'HUBA_enabled');
    removeClassToElements('.HUBA_enabled', 'HUBA_disabled');
    removeClassToElements('.HUBA_enabled', 'HUBA_hide');
}

// 스타일 정보 백업
// 기본 스타일 정보와 바뀔 새로운 스타일 정보를 데이터로 저장
function initElementStyle(arr, styles)
{
    for (var i = 0; i < arr.length; i++)
    {
        $(arr[i]).each(function(index) {
            var s = $(this).attr("style") || ''
            $(this).attr("style_org", s +' ')

            if (styles[i][2] == 'replace')
            {
                $(this).attr("style_new", styles[i][1] || '')
            }
            else
            {
                $(this).attr("style_new", s +' '+ styles[i][1] || '')
            }
        });
    }
}

// 스타일 변경을 해야하는 객체의 경우 스타일을 업데이트 한다
function toggleModifyStyle(arr, flag)
{
    for (var i = 0; i < arr.length; i++)
    {
        $(arr[i]).each(function(index) {
            $(this).attr("style", (flag == "NEW" ? $(this).attr("style_new") : $(this).attr("style_org")));
        });
    }
}

// 객체에 지정한 클래스 추가
function addClassToElements(el, cls)
{
    if (Array.isArray(el))
    {
        $.each(el, function(index, item){
            if ( ! $(item).hasClass(cls))
                $(item).addClass(cls);
        });
    }
    else
    {
        if ( ! $(el).hasClass(cls))
            $(el).addClass(cls);
    }
}

// 객체에 지정한 클래스 삭제
function removeClassToElements(el, cls)
{
    if (Array.isArray(el))
    {
        $.each(el, function(index, item){
            if ($(item).hasClass(cls))
                $(item).removeClass(cls);
        });
    }
    else
    {
        if ($(el).hasClass(cls))
            $(el).removeClass(cls);
    }
}

// XPATH 입력값에 맞는 객체들을 배열로 반환한다
function getElementsByXPath(arr)
{
    var result = [];

    $.each(arr, function(index, item)
    {
        var el = (Array.isArray(item) ? item[0] : item)

        if (el.match('^\/'))
        {
            var iterator = xpath(el);

            for (var i = 0; i < iterator.snapshotLength; i++)
                result.push(iterator.snapshotItem(i));
        }
        else
        {
            result.push(el);
        }
    });

    return result.slice();
}

// 배열값의 객체들을 지정된 상태값대로 변경한다
function initElementsStatus(arr, stat)
{
    var c = ((stat == 1) ? ['HUBA_disabled', 'HUBA_enabled'] : ['HUBA_enabled', 'HUBA_disabled']);

    for (var i = 0; i < arr.length; i++)
    {
        $(arr[i]).addClass(c[0]).removeClass(c[1]);
    }
}

// 이벤트 추가
function addEventToElements(arr, func)
{
    for (var i = 0; i < arr.length; i++)
    {
        $(arr[i]).click(func);
    }
}

// 이벤트 제거
function removeEventToElements(arr, func)
{
    for (var i = 0; i < arr.length; i++)
    {
        $(arr[i]).unbind('click', func);
    }
}

// 표시 여부 토글
function handlerToggleDisplay(el)
{
    $(this).toggleClass('HUBA_enabled').toggleClass('HUBA_disabled');
}

function dbg(msg)
{
    $('#Dbg').append('<div>'+ msg +'</div>');
}

// ---

$(document).ready(function() {
  HUBA.initialize();
});

// ---

// @source	https://gist.github.com/iimos/e9e96f036a3c174d0bf4
function xpath(el)
{
    if (typeof el == "string") return document.evaluate(el, document, null, 6, null)
    if (!el || el.nodeType != 1) return ''
    if (el.id) return "//*[@id='" + el.id + "']"
    var sames = [].filter.call(el.parentNode.children, function (x) { return x.tagName == el.tagName })
    return xpath(el.parentNode) + '/' + el.tagName.toLowerCase() + (sames.length > 1 ? '['+([].indexOf.call(sames, el)+1)+']' : '')
}
