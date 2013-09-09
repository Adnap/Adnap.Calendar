/*! Adnap.SubmitPopup - v.1.0.1 - 08.09.2013
* Requires scripts: jQuery (v. 1.9)
* Maria Perebeynos © 2013 
* mailto: pani.adnap@gmail.com
* Licensed: MIT */

var Adnap = Adnap || {};

Adnap.SubmitPopup = function(popupSelector, options) {
	this._instance = $(popupSelector);
	this._errorSelector = '.js-adnap-event-val';
	this._options = $.extend({ relativePos: "bottom", heightOffset: 15, widthOffset: 15, submitBtnTitle: 'Готово', removeBtnTitle: 'Удалить' }, options);
	this._withDeleteBtn = false;
	
	this._init();
}

$.extend(Adnap.SubmitPopup.prototype, {
	
	showPopup: function($element) {
		$element = $element || this._options.externalBtn;
		this._updatePosition($element);
		this._instance.show();
		if(typeof(this._options.onShowCallback) === 'function')
		{
			this._options.onShowCallback();
		}
	},
	
	closePopup: function() {
		if(!this.isActive())
		{
			return;
		}
		this._instance.hide();
		this._instance.find('input[type=text]').val("");
		this._instance.find('textarea').val('');
		this._instance.find(this._errorSelector).empty();
		if(typeof(this._options.onCloseCallback) === 'function')
		{
			this._options.onCloseCallback();
		}
	},
	
	submitData: function() {
		var closeAfter = false;
		if (typeof(this._options.submitHandler) === 'function')
		{
			var $form = this._instance.find('.modal_submit_form');
			closeAfter = this._options.submitHandler($form);
		}
		if (closeAfter) {
			this.closePopup();
		}
	},
	
	deleteData: function() {
		this._options.removeHandler();
		this.closePopup();
	},
	
	isActive: function() {
		return this._instance.is(':visible');
	},
	
	setContent: function(content) {
		if (!!content) 
		{
			this._instance.find('.modal_submit_form').html(content);
		}		
	},
	
	setOnCloseEvent: function(onCloseCallback)
	{
		if (typeof(onCloseCallback) === 'function')
		{
			this._options.onShowCallback = onCloseCallback;
		}
	},
	
	_init: function() {
		if (!this._instance || !this._instance.length) 
		{
			throw new Error('Undefined popup container!');
		}
		this._withDeleteBtn = typeof (this._options.removeHandler) === 'function';
		this._renderPopup();
		this._setPopupEvents();
	},
	
	_renderPopup: function() {
		var content = '<div class="modal_wrapper"><button type="button" class="close_modal js-close-popup"></button> \
			<div class="modal_content"><form class="modal_submit_form"></form>\
			<button type="button" class="modal_btn js-submit-popup">' + this._options.submitBtnTitle + '</button>' +
			( this._withDeleteBtn ? '<button type="button" class="modal_btn js-remove-popup">' + this._options.removeBtnTitle + '</button>' : '' ) +
			'</div><div class="js-arrow left_arrow"></div></div>';
		this._instance.html(content);
	},
	
	_setPopupEvents: function() {
		var self = this;
		// todo preventDefault
		this._instance.find('.js-close-popup').on('click', function(){ self.closePopup(); });
		this._instance.find('.js-submit-popup').on('click', function() { self.submitData(); });
		if (this._withDeleteBtn)
		{
			this._instance.find('.js-remove-popup').on('click', function() { self.deleteData(); });
		}
		if (this._options.externalBtn)
		{
			this._options.externalBtn.on('click', function() { self.showPopup(); })
		}
	},
	
	_updatePosition: function($el) {
		if (!$el || !$el.length )
		{
			return;
		}
		var relative = $el.data('popup-position') || this._options.relativePos;
		var position = $el.offset();
		var leftPos = position.left;
		var topPos = position.top;
		var arrowClass = '';
		
		switch(relative)
		{
			case "left":
				leftPos = leftPos - this._instance.outerWidth() - this._options.widthOffset;
				topPos = topPos + this._options.heightOffset;
				arrowClass = "right_arrow";
				break;
			case "right":
				leftPos = leftPos + $el.outerWidth() + this._options.widthOffset;
				topPos = topPos + this._options.heightOffset;
				arrowClass = "left_arrow";
				break;
			case "top":
				leftPos = leftPos + this._options.widthOffset;
				topPos = topPos + $el.outerHeight() + this._options.heightOffset;
				arrowClass = "bottom_arrow";
				break;
			case "bottom":
				leftPos = leftPos + this._options.widthOffset;
				topPos = topPos + $el.outerHeight() + this._options.heightOffset;
				arrowClass = "top_arrow";
				break;
		}
		
		if (leftPos < 0) { leftPos = 0; }
		if (topPos < 0) { topPos = 0; }

		this._instance
			.css('top', topPos)
			.css('left', leftPos);
		
		var arrow = this._instance.find('.js-arrow');
		if (!arrow.hasClass(arrowClass))
		{
			arrow.removeClass('left_arrow right_arrow down_arrow up_arrow')
				.addClass(arrowClass);
		}
	}
});