// ==UserScript==
// @name         HumorUnivBestAssist
// @namespace    http://humoruniv.net/
// @version      0.1.1
// @description  웃대 사이트 게시물을 캡쳐하기 좋게 편집함
// @author       KKM
// @match        http://m.humoruniv.com/board/read.html?*
// @grant        GM_setValue
// @grant        GM_getValue
// @require      https://code.jquery.com/jquery-migrate-1.4.1.js
// ==/UserScript==

var IS_INIT = false;

// 삭제될 오브젝트들
var HUBA = {
    // 삭제할 오브젝트들 (비표시)
    _xpath_removes : [
        '//*[@id="navi"]',// [상단] 네비게이션
        '//*[@id="pnut_iframe"]',// 상단 광고
        '//*[@id="read_subject_div"]/table/tbody/tr/td[2]',// [상단] ▲ 버튼
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
        ['//*[@id="read_subject_div"]/table/tbody/tr/td[1]/h2', 'text-align:left; font-weight:bold'],// 게시물 제목 스타일
        ['//*[@id="content_info"]/table/tbody/tr', 'height:98px']// 작성자 정보 스타일
    ],

    // 유저 선택에 따라 처리될 오브젝트들 (이미지, 내용, 댓글 등)
    _is_display_contents : Number(GM_getValue('default_display_contents', 0)),
    _xpath_contents : [
        '//*[@id="wrap_copy"]/div/div',// 게시물 내 문단 #1 이미지류
        '//*[@id="wrap_copy"]/table | //*[@id="wrap_copy"]/p'// 게시물 내 문단 #2 GIF/텍스트
    ],

    // 베스트 댓글
    _is_display_bestreply : Number(GM_getValue('default_display_bestreply', 0)),
    _xpath_bestreply : [
        '.comment_best_wrap > li',// 베스트 댓글 테이블
    ],

    // 일반 댓글
    _is_display_reply : Number(GM_getValue('default_display_reply', 0)),
    _xpath_reply : [
        '#comment > ul > li'// 댓글
    ],

    _hide_reply_recomm_count : Number(GM_getValue('default_hide_reply_recomm_counts', 10)),

    _obj_removes : null,
    _obj_modify : null,
    _obj_contents : null,
    _obj_bestreply : null,
    _obj_reply : null,

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
                                +'<li><input id="HUBAoptContEnable" type="checkbox" value="1" '+ ((this._is_display_contents == true) ? 'checked' : '') +'> 내용 기본 비활성화</li>'
                                +'<li><input id="HUBAoptBestReplyEnable" type="checkbox" value="1" '+ ((this._is_display_bestreply == true) ? 'checked' : '') +'> 베스트댓글 기본 비활성화</li>'
                                +'<li><input id="HUBAoptReplyEnable" type="checkbox" value="1" '+ ((this._is_display_reply == true) ? 'checked' : '') +'> 댓글 자동으로 비활성화</li>'
                                +'<li>댓글 추천 <input id="HUBAoptReplyLimit" type="text" value="'+ this._hide_reply_recomm_count +'" style="width:30px"><b>이하</b> 비활성화</li>'
                                +'<li>댓글 비추천 <input id="HUBAoptReplyLimit" type="text" value="'+ this._hide_reply_recomm_count +'" style="width:30px"><b>이상</b> 비활성화</li></ul>'
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

        this._obj_removes = getElementsByXPath(this._xpath_removes);
        this._obj_modify = getElementsByXPath(this._xpath_modify);
        this._obj_contents = getElementsByXPath(this._xpath_contents);
        this._obj_bestreply = getElementsByXPath(this._xpath_bestreply);
        this._obj_reply = getElementsByXPath(this._xpath_reply);

        for (var i = 0; i < this._obj_modify.length; i++)
        {
            $(this._obj_modify[i]).attr("style", this._xpath_modify[i][1])
        }
    }
};

function handlerOpenControlPanel()
{
    showGuide();

    // 설정창 열기
    $('#HUBAController').toggle();
}

// showGuide()
//
//
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

    //toggleModifyStyle(HUBA._obj_modify, "OLD");

    addEventToElements(HUBA._obj_contents, handlerToggleDisplay);// 이벤트 추가
    addEventToElements(HUBA._obj_bestreply, handlerToggleDisplay);// 이벤트 추가
    addEventToElements(HUBA._obj_reply, handlerToggleDisplay);// 이벤트 추가

    //a = getElementsByXPath(this._xpath_removes);
    removeClassToElements(HUBA._obj_removes, 'HUBA_remove');

    // 감춰진 오브젝트들 해제 (다시 선택 가능하도록)
    removeClassToElements('.HUBA_hide', 'HUBA_hide');
}

function hideGuide()
{
    // 제거될 오브젝트 처리
    addClassToElements(HUBA._obj_removes, 'HUBA_remove');

    // 내용 오브젝트 처리,
    removeEventFromElements(HUBA._obj_contents, handlerToggleDisplay);// 이벤트 제거
    removeEventFromElements(HUBA._obj_bestreply, handlerToggleDisplay);// 이벤트 추가
    removeEventFromElements(HUBA._obj_reply, handlerToggleDisplay);// 이벤트 추가

    // 스타일 수정 오브젝트 처리
    //toggleModifyStyle(HUBA._obj_modify, "NEW");

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

// 스타일 변경을 해야하는 객체의 경우 스타일을 업데이트 한다
function toggleModifyStyle(arr, flag)
{
    var s
    for (var i = 0; i < arr.length; i++)
    {
        s = (flag == "NEW" ? $(arr[i]).data("style1") : $(arr[i]).data("style2"))
        
        $(arr[i]).attr("style", s);
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
function removeEventFromElements(arr, func)
{
    for (var i = 0; i < arr.length; i++)
    {
        $(arr[i]).unbind('click', func);
    }
}

function handlerToggleDisplay(el)
{
    $(this).toggleClass('HUBA_enabled').toggleClass('HUBA_disabled');
}

function dbg(msg)
{
    $('#Dbg').append('<div>'+ msg +'</div>');
}


(function() {
    HUBA.initialize();
})();

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
