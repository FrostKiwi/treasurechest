// ==UserScript==
// @name        WaniKani Japanese Review Questions
// @namespace   WK_CustomQuestion
// @description Changes the text of the Review or Lesson Quiz question. Specifies ON or KUN reading for Kanji. Options to have the text in English or Japanese.
// @author      hoovard, modified by FrostKiwi
// @include     https://www.wanikani.com/review/session*
// @include     http://www.wanikani.com/review/session*
// @include     https://www.wanikani.com/lesson/session*
// @include     http://www.wanikani.com/lesson/session*
// @version     0.4.3
// @license     Do what you want with it (Preferably improve it).
// @grant       none
// ==/UserScript==
// Version 0.4.3 applies to Reviews and Lesson Quizzes.

// Language options
// English "en", Japanese "ja"
var strLang = "ja";


// Tested on the following:
// Firefox 35.0.1 and Chrome 39.0.2171.95 (64-bit), Linux Mint 17.1 Cinnamon 64-bit
// Firefox 35.0.1 and Chrome 40.0.2214.115 m, Windows 8.1 64-bit

// Thanks to Rui Pinheiro (LordGravewish) for the original script
// and to Ethan for the idea to use MutationObserver to detect changes in the DOM.

// Vars to compose the replacement question string
var strKanji;
var strRadical;
var strVocab;
var strMeaning;
var strReading;
var strVocabReading;
var strOn;
var strKun;
var strName;

// Translations
switch (strLang)
{
	case "en":
		strKanji = "Kanji";
		strRadical = "Radical";
		strVocab = "Vocabulary";
		strMeaning = "Meaning";
		strReading = "yomi";
		strVocabReading = "Reading";
		strOn = "on'";
		strKun = "kun'";
		strName = "Name";
		break;
	case "ja":
		strKanji = "漢字の";
		strRadical = "部首の";
		strVocab = "単語の";
		strMeaning = "意味";
		strReading = "読み";
		strVocabReading = "読み";
		strOn = "音";
		strKun = "訓";
		strName = "名前";
		break;
}

// Variable to save and check against the previous contents of the jStorage item
var objSavedCurrentItem;

// Review or Lesson Quiz. jStorage objects are different.
bIsReview = ($(location).attr('href').indexOf("review") != -1);

// Code from Stack Overflow to detect changes in the DOM.
// (http://stackoverflow.com/questions/3219758/detect-changes-in-the-dom/14570614#14570614)
var observeDOM = (function(){
    var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver,
        eventListenerSupported = window.addEventListener;

    return function(obj, callback){
        if( MutationObserver ){
            // define a new observer
            var obs = new MutationObserver(function(mutations, observer){
                if( mutations[0].addedNodes.length || mutations[0].removedNodes.length )
                    callback();
            });
            // have the observer observe for changes in children
            obs.observe( obj, { childList:true, subtree:true });
        }
        else if( eventListenerSupported ){
            obj.addEventListener('DOMNodeInserted', callback, false);
            obj.addEventListener('DOMNodeRemoved', callback, false);
        }
    }
})();

// Callback function observing the 'question-type' div 'h1' element
var observeMe = $('#question-type h1')[0];
observeDOM( observeMe ,function(){
    var objCurItem;
    if (bIsReview) {
		objCurItem = $.jStorage.get("currentItem");
	} else {
		objCurItem = $.jStorage.get("l/currentQuizItem");
	}


    // Make sure that the currentItem has changed before updating.
    // Otherwise you will respond to your own DOM changes.
    if (objCurItem != objSavedCurrentItem) {
		objSavedCurrentItem = objCurItem;

		var strQuestionType;
		if (bIsReview) {
			strQuestionType = $.jStorage.get("questionType");
		} else {
			strQuestionType = $.jStorage.get("l/questionType");
		}

		var strItemType = "";
		var strReadingType = "Reading";

		// Compose the string elements to be sent into the h1 element
		if ("kan" in objCurItem)
		{
			// Kanji
			strItemType = strKanji;
			if (strQuestionType == "reading") {
				if(objCurItem.emph == "onyomi")
					strReadingType = strKanji + strOn + strReading;
				else
					strReadingType = strKanji + strKun + strReading;
			} else {
				strReadingType = strKanji + strMeaning;
			}
		}
		else if ("voc" in objCurItem)
		{
			// Vocabulary
			strItemType = strVocab;
			if (strQuestionType == "reading") {
					strReadingType = strVocab + strVocabReading;
			} else {
				strReadingType = strVocab + strMeaning;
			}
		}
		else if ("rad" in objCurItem)
		{
			// Radical
			strItemType = strRadical;
			strReadingType = strRadical + strName;
		}

		// replace the contents of #question-type h1
		switch (strLang)
		{
			case "en":
				$('#question-type h1').html(strItemType + ' <strong>' + strReadingType + '</strong>');
				break;
			case "ja":
				$('#question-type h1').html(strReadingType);
				break;
		}
	}

});