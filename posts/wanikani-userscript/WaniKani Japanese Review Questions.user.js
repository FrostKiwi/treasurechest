// ==UserScript==
// @name        WaniKani Japanese Review Questions
// @namespace   WK_CustomQuestion
// @description Changes the text of the Review or Lesson Quiz question. Original created by hoovard, with extra thanks going to previous authors Rui Pinheiro (LordGravewish) and Ethan.
// @author    FrostKiwi
// @match     *://www.wanikani.com/subjects/review*
// @match     *://www.wanikani.com/recent-mistakes*
// @match     *://www.wanikani.com/subject-lessons*
// @version     0.5.0
// @license     Do what you want with it (Preferably improve it).
// @grant       none
// ==/UserScript==
// Version 0.5.0 applies to Reviews, Lesson Quizzes and extra studies

(function () {
	const translations = {
		'vocabulary': '単語の',
		'radical': '部首の',
		'kanji': '漢字の',
		'reading': '読み',
		'onyomi': '音読み',
		'kunyomi': '訓読み',
		'meaning': '意味',
		'name': '名'
	};

	let reading_type = null;
	let container = null;
	let categorySpan = null;
	let typeSpan = null;

	/* Predefine the observers to ensure we don't accidentally create more than
	   two in some unknown edge case */
	const observerType = new MutationObserver(() => replaceText(typeSpan));
	const observerCategory = new MutationObserver(() => replaceText(categorySpan));

	function initElements() {
		container = document.querySelector('.quiz-input__question-type-container');
		categorySpan = document.querySelector('.quiz-input__question-category');
		typeSpan = document.querySelector('.quiz-input__question-type');
		observerType.observe(categorySpan, { childList: true });
		observerCategory.observe(typeSpan, { childList: true });
	}

	function replaceText(element) {
		const text = element.innerText.toLowerCase();
		if (translations[text]) {
			element.innerText = translations[text];
			if (reading_type && text == 'reading') {
				element.innerText = translations[reading_type];
			}
		}
	}

	function clearWhitespace() {
		Array.from(container.childNodes).forEach(node => {
			if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) {
				container.removeChild(node);
			}
		});
	}

	const newQuestion = function (e) {
		if (e.detail.subject.type == 'Kanji' && e.detail.questionType == "reading") {
			reading_type = e.detail.subject.primary_reading_type;
		} else {
			reading_type = null;
		}
		if (!container || !categorySpan || !typeSpan) {
			initElements();
		}
		clearWhitespace();
	}

	window.addEventListener('willShowNextQuestion', newQuestion);
})();