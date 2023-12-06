// ==UserScript==
// @name        WaniKani Japanese Review Questions
// @namespace   WK_CustomQuestion
// @description Changes the text of the Review or Lesson Quiz question. Original created by hoovard, with extra thanks going to previous authors Rui Pinheiro (LordGravewish) and Ethan.
// @author    FrostKiwi
// @match     *://www.wanikani.com/subjects/review*
// @match     *://www.wanikani.com/subjects/extra_study*
// @match     *://www.wanikani.com/subject-lessons*
// @version     0.5.0
// @license     Do what you want with it (Preferably improve it).
// @grant       none
// ==/UserScript==
// Version 0.5.0 applies to Reviews, Lesson Quizzes and extra studies

(function () {
	var container = document.querySelector('.quiz-input__question-type-container');
	var categorySpan = document.querySelector('.quiz-input__question-category');
	var typeSpan = document.querySelector('.quiz-input__question-type');

	function replaceText(element, text) {
		element.innerText = text;
	}
	/* Strip Whitespace without messing with he styling */
	function clearWhitespace() {
		Array.from(container.childNodes).forEach(node => {
			if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) {
				container.removeChild(node);
			}
		});
	}
	var observer = new MutationObserver(function (mutations) {
		mutations.forEach(function (mutation) {
			if (mutation.type === 'childList') {
				switch (categorySpan.innerText) {
					case 'Vocabulary':
						replaceText(categorySpan, '単語の');
						break;
					case 'Radical':
						replaceText(categorySpan, '部首の');
						break;
					case 'Kanji':
						replaceText(categorySpan, '漢字の');
						break;
				}

				switch (typeSpan.innerText) {
					case 'Reading':
						replaceText(typeSpan, '読み');
						break;
					case 'Meaning':
						replaceText(typeSpan, '意味');
						break;
				}
			}
		});

		clearWhitespace();
	});

	var config = { childList: true };

	observer.observe(categorySpan, config);
	observer.observe(typeSpan, config);
})();