/*! Adnap.Calendar - v.1.0.1 - 08.09.2013
* Requires scripts: jQuery (v. 1.9) and Adnap.SubmitPopup
* Maria Perebeynos © 2013 
* mailto: pani.adnap@gmail.com
* Licensed: MIT */

var Adnap = Adnap || {};

Adnap.Calendar = function(calendarSelector, externalPopupBtn) {
	
	this._selector = calendarSelector || '#js-adnap-calendar-ph';
	this._externalPopupBtn = externalPopupBtn;
	
	this._currentMonth;
	this._currentYear;
	
	this._$container;
	this._currentCell;
	this._infoPopup;
	this._externalPopup;
	
	this._storedEvents;	
	
	this._currCenturyMaxYear = 10;
	this._currCentury;
	
	this.localNames = {
		daysName: ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"],
		monthName: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
		monthForDaysName: ["Января", "Февраля", "Марта", "Апреля", "Мая", "Июня", "Июля", "Августа", "Сентября", "Октября", "Ноября", "Декабря"],
		shortMonthName: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"],
		emptyEventTitleError: "Пожалуйста, введите название события.",
		emptyInfoError: "Пожалуйста, введите дату и название события.",
		invalideRawEventFormat: "Дата события и описание должны быть разделены запятой.",
		invalidDateError: "Некорректный формат даты.",
		eventPlaceholder: "Событие",
		todayTitle: "Сегодня",
		peopleTitle: "Участники:",
		peoplePlaceholder: "Имена участников",
		descriptionPlaceholder: "Описание",
		rawEventPlaceholder: "5 марта, День рождения"		
	}
	
	this._init();
};

$.extend(Adnap.Calendar.prototype, {

	_init: function() {
		var today = new Date();
		this._currentMonth = today.getMonth();
		this._currentYear = today.getFullYear();
		this._currCenturyMaxYear = this._currentYear + this._currCenturyMaxYear;
		this._currCentury = this._currentYear - (this._currentYear % 100);
		
		this._loadCalendarEvents();
		this._renderCalendar();
		
		this._setupPopups();
		this._setNaviHandlers();
	
	},
	
	_setNaviHandlers: function() {
		var self = this;
		var $navi = this._$container.find('.calendar_navi');
		$navi.find('#js-goto-today').on('click', function() { self._gotoToday(); });
		$navi.find('#js-goto-prev-month').on('click', function() { self._gotoPrevMonth(); });
		$navi.find('#js-goto-next-month').on('click', function() { self._gotoNextMonth(); });
	},
	
	_setCellsHandlers: function() {
		var self = this;
		this._getCalendar().on('click', 'td', function(event) {
				event.preventDefault();
				self._onDaySelect(this) 
			});
	},
	
	_setupPopups: function() {
		var self = this;
		$('body').append('<div id="adnap_info_popup" class="modal"></div>')
		this._infoPopup = new Adnap.SubmitPopup('#adnap_info_popup',
  			{ relativePos: "right",
			  heightOffset: -20,
			  submitHandler: function($form) { return self.tryFillCurrentEvent($form); },
			  removeHandler: function() {self.deleteCurrentEvent();},
			  onCloseCallback: function() {	self._unselectCell(); },			  
            });
		if (!this._externalPopupBtn)
		{
			return;
		}
		var $btn = $(this._externalPopupBtn);
		if ($btn.length)
		{	
			$('body').append('<div id="add_event_popup" class="modal"></div>')
			this._externalPopup = new Adnap.SubmitPopup('#add_event_popup', 
				{ 	externalBtn: $btn,
					widthOffset: 0,
					submitBtnTitle: 'Создать',
					submitHandler: function($form) { return self.tryAddRawEvent($form); },
					onShowCallback: function() { self._infoPopup.closePopup(); }
				});
			this._externalPopup.setContent(this._renderExternalPopupContent());
			this._infoPopup.setOnCloseEvent(function() { self._externalPopup.closePopup();})
		}		
	},
	
	tryAddRawEvent: function($form)
	{
		var error = $form.find('.js-event-val');
		var event = $form.find('.js-event').val();
		
		var parsedEvent = this._parseEvent(event, error);
		if (parsedEvent)
		{
			this._addCalendarEvent(parsedEvent);
			this._saveCalendarEvents();
			this._appendCellEvent(parsedEvent, true);
			return true;
		}
		return false;
	},
	
	tryFillCurrentEvent: function($form)
	{
		var event = {
			'year': this._currentCell.data('year'),
			'month': this._currentCell.data('month'),
			'day': this._currentCell.data('day')
		};		
		$.extend(event, (this._getDayEvent(event.year, event.month, event.day)||{}));					
		$form.find('input, textarea').each(
			function() {
				var value = this.value || '';
				value = $.trim(value);
				if (value)	{
					value = value[0].toUpperCase() + value.substr(1);
					event[this.name] = value;
				}
			}
		);		
		if (!event.title)
		{
			var error = $form.find('.js-event-val');
			error.html(this.localNames.emptyEventTitleError);
			return false;
		}		
		this._addCalendarEvent(event);
		this._saveCalendarEvents();
		this._appendCellEvent(event);
		return true;
	},
	
	deleteCurrentEvent: function() {
		var year = this._currentCell.data('year'),
			month = this._currentCell.data('month'),
			day = this._currentCell.data('day');
		
		delete this._storedEvents[year][month][day];
		this._saveCalendarEvents();
		this._removeCurrentCellEvent();
		return false;
	},
	
	setLocalization: function(options)
	{
		options = options || {};
		$.extend(this.localNames, options);
	},

	_gotoToday: function() {
		var today = new Date();
		var newMonth = today.getMonth();
		var newYear = today.getFullYear();
		// даже если сегодня видно на странице, перемещаем к месяцу
		if (this._currentMonth !== newMonth || this._currentYear !== newYear) 
		{
			this._currentMonth = newMonth;
			this._currentYear = newYear;
			this._updateNavigation();
			this._updateCalendar();
		}
	},
	
	_gotoPrevMonth: function() {
		this._currentMonth--;
		if (this._currentMonth < 0)
		{
			this._currentMonth = this._currentMonth + 12;
			this._currentYear--;
		}
		this._updateNavigation();
		this._updateCalendar();
	},
	
	_gotoNextMonth: function() {
		this._currentMonth++;
		if (this._currentMonth > 11)
		{
			this._currentMonth = this._currentMonth - 12;
			this._currentYear++;
		}
		this._updateNavigation();
		this._updateCalendar();
	},
		
	_onDaySelect: function(cell) {
		if (this._currentCell){
			if (this._currentCell[0] == cell && this._infoPopup.isActive()) {
				return;
			} else {
				this._currentCell.removeClass('current');
			}
		}
		this._currentCell = $(cell);
		this._currentCell.addClass('current');
		this._showInfoPopup();
	},
	
	_showInfoPopup: function() {
		var day = this._currentCell.data('day'),
			month = this._currentCell.data('month'),
			year = this._currentCell.data('year');
		var popupContent = (this._currentCell.is('.event')) ?
			this._renderInfoPopupContent(year, month, day):
			this._renderEmptyInfoPopupContent(year, month, day);
		this._infoPopup.setContent(popupContent);
		this._infoPopup.showPopup(this._currentCell);
	},
	
	_updateNavigation: function() {
		var curr = this.localNames.monthName[this._currentMonth] + ' ' + this._currentYear;
		this._$container.find('.calendar_navi').find('.js-current-month').text(curr);
		if (this._infoPopup) {	this._infoPopup.closePopup(); }
		if (this._externalPopup) { this._externalPopup.closePopup(); }
	},
	
	_updateCalendar: function() {
		this._getCalendar().replaceWith(this._renderCalendarTable());
		this._currentCell = null;
		
		this._markToday();
		this._markEvents();
		this._setCellsHandlers();
	},
	
	_markToday: function() {
		var today = new Date();
		var day = today.getDate(),
			month = today.getMonth(),
			year = today.getFullYear();
		var $cell = this._tryGetCell(year, month, day);
		if ($cell)
		{
			$cell.addClass('today');
		}	
	},
	
	_markEvents: function() {
		var monthEvents;
		var iterateMonth;
		var $cells = this._getCalendar().find('td');
		var self = this;
		$cells.each(function(i, el) {
			var item = $(el);
			if (!monthEvents || iterateMonth != item.data('month'))
			{
				iterateMonth = item.data('month');
				monthEvents = self._getMonthEvents(item.data('year'), iterateMonth) || {};
			}
			var event = monthEvents[item.data('day')];
			self._addEventCellContent(event, item);
		});
	},
	
	_addEventCellContent: function(event, cell)
	{
		cell = cell || this._currentCell;
		if (!event || !cell) return;
		var text = '<p class="name">' + event.title + '</p>';
		var people = event.people || ''
		var text = text + '<p class="people">' + people + '</p>'
		cell.find('p:not(.date)').remove();
		cell.append(text).addClass('event');
	},
	
	_appendCellEvent: function(event, showPopup)
	{
		this._currentCell = this._tryGetCell(event.year, event.month, event.day);
		if (!this._currentCell)
		{
			this._currentMonth = event.month;
			this._currentYear = event.year;
			this._updateCalendar();
			this._currentCell = this._tryGetCell(event.year, event.month, event.day);
		} 
		else
		{
			this._addEventCellContent(event);
		}
		if (showPopup)
		{
			this._currentCell.click();
		}		
	},
	
	_removeCurrentCellEvent: function()	{
		this._currentCell.removeClass('event');
		this._currentCell.find('p:not(".date")').remove();
	},

	_unselectCell: function(){
		if (this._currentCell)
		{
			this._currentCell.removeClass('current');
			this._currentCell = null;
		}
	},
	
	_tryGetCell: function(year, month, day) {
		var selector = 'td[data-year="' + year + '"][data-month="' + month + '"][data-day="' + day + '"]';
		var cell = this._getCalendar().find(selector);
		return !cell.length ? null : cell;
	},
	
	_getCalendar: function() {
		return this._$container.find('table.calendar_table');
	},
	
	_renderCalendar: function()	{
		this._$container = this._$container || $(this._selector);
		
		this._$container.html(this._renderCalendarNavi());
		this._$container.append(this._renderCalendarTable());
		this._currentCell = null;
		
		this._markToday();
		this._markEvents();
		this._setCellsHandlers();
	},
	
	_renderCalendarNavi: function() {
		var navi = '<div class="calendar_navi"><div class="left"> \
					<button type="button" class="prev" id="js-goto-prev-month">&#9664;</button> \
					<span class="month js-current-month">' + this.localNames.monthName[this._currentMonth] + ' ' + this._currentYear + 
					'</span><button type="button" class="next" id="js-goto-next-month">&#9654;</button></div> \
					<div class="left"><button type="button" class="today" id="js-goto-today">' + this.localNames.todayTitle + '</button></div></div>';
		return navi;
	},

	_renderCalendarTable: function() {
		var totalDays = this._daysInMonth(this._currentYear, this._currentMonth);
		var iterateDate = this._firstMonday(this._currentYear, this._currentMonth);
		var lastDayOfMonth = new Date(this._currentYear, this._currentMonth, totalDays);
		
		var days = lastDayOfMonth - iterateDate;
		days = Math.ceil(days / this._msInDay) + 1;
		var rowsCount = Math.ceil(days / 7);
		
		var table = '<table class="calendar_table">';
		for (var row = 0; row < rowsCount; row++)
		{
			table = table + '<tr>'
			for (var dayPos = 0; dayPos < 7; dayPos++)
			{
				var strDay = iterateDate.getDate();
				if (!row) 
				{
					var currentDay = iterateDate.getDay()
					strDay = this.localNames.daysName[currentDay] + ', ' + strDay;
				}
				table = table + '<td data-year="' + iterateDate.getFullYear()
						+ '" data-month="' + iterateDate.getMonth()
						+ '" data-day="' + iterateDate.getDate()
						+ '"><p class="date">' + strDay + '</p></td>';
				iterateDate.setDate(iterateDate.getDate() + 1);
			}
			table = table + '</tr>';
		}
		table = table + '</table>';
		return table;
	},
	
	_renderInfoPopupContent: function(year, month, day) {
		var event = this._storedEvents[year][month][day];
		var content = '<p class="title">' + event.title + '</p>\
				   <p class="date">' + day + ' ' + this.localNames.monthForDaysName[month] + '</p>' +
					  (event.people ? '<p class="label">' + this.localNames.peopleTitle + '</p><p class="people">' + event.people + '</p>' :
						               '<input type="text" placeholder="' + this.localNames.peoplePlaceholder + '" name="people"/>') +
				   '<textarea placeholder="' + this.localNames.descriptionPlaceholder + '" cols="30" rows="6" name="description">' + (event.description || '') + '</textarea>';
        return content;
	},
	
	_renderEmptyInfoPopupContent: function(year, month, day) {
		var content = '<input type="text" placeholder="' + this.localNames.eventPlaceholder + '" name="title"/><p class="date">' + day + ' ' + this.localNames.monthForDaysName[month] + '</p>\
				   <input type="text" placeholder="' + this.localNames.peoplePlaceholder + '" name="people" />\
   			       <textarea placeholder="' + this.localNames.descriptionPlaceholder + '" cols="30" rows="6" name="description"></textarea>';
	    return content;
	},
	
	_renderExternalPopupContent: function() {
		var content = '<div id="js-add-event-form">\
					   <input type="text" placeholder="' + this.localNames.rawEventPlaceholder + '" class="js-event"></input>\
					   <p class="js-event-val"></p></div>'
		return content;
	},
	
	_addCalendarEvent: function(event)
	{
		if (event && event.year && event.month && event.day && event.title)
		{
			var eventInfo = {};
			for (var info in event)
			{
				if(info != 'year' && info != 'month' && info !='day')
				{
					eventInfo[info] = event[info];
				}
			}
			
			var appendEvent = {};
			appendEvent[event.year] = {};
			appendEvent[event.year][event.month] = {};
			appendEvent[event.year][event.month][event.day] = eventInfo;			
			
			$.extend(true, this._storedEvents, appendEvent);
		}
	},
	
	_loadCalendarEvents: function()
	{
		if (!window.localStorage)
		{
			alert('Сохранение данных в календаре не поддерживается в вашем браузере!');
			return;
		}
		var events = window.localStorage.getItem('adnapCalendar');
		try {
			this._storedEvents = JSON.parse(events);
		} catch(er){ 
			/* show error */
		}
		this._storedEvents = this._storedEvents || {};
	},
	
	_saveCalendarEvents: function()
	{
		if (!window.localStorage)
		{
			return;
		}
		var data = JSON.stringify(this._storedEvents);
		window.localStorage.setItem('adnapCalendar', data);
	},
	
	_getMonthEvents: function(year, month)
	{
		var monthEvents = null;
		if (this._storedEvents && this._storedEvents[year])
		{
			monthEvents = this._storedEvents[year][month];
		}		
		return monthEvents;
	},
	
	_getDayEvent: function(year, month, day)
	{
		var monthEvent = this._getMonthEvents(year, month);
		return monthEvent ? monthEvent[day] : null;
	},
	
	_daysInMonth: function(year, month)
	{
		return 32 - new Date(year, month, 32).getDate();
	},
		
	_firstMonday: function(year, month)
	{
		var firstDay = new Date(year, month, 1);
		var dayOfWeek = (firstDay.getDay() + 6) % 7;
		if (dayOfWeek)
		{
			firstDay.setDate(0);
			var day = firstDay.getDate() - dayOfWeek + 1;
			firstDay.setDate(day);
		}
		return firstDay;
	},
	
	_parseEvent: function(event, errorContainer) {
		if (!event || !event.length)
		{
			errorContainer.text(this.localNames.emptyInfoError);
			return;
		}
		var splitPos = event.indexOf(',');
		if (!splitPos)
		{
			errorContainer.text(this.localNames.invalideRawEventFormat);
			return;
		}		
		var date = this._parseDate(event.substr(0, splitPos), errorContainer);
		var eventName = $.trim(event.substr(splitPos + 1));
		if (!eventName)
		{
			errorContainer.text(this.localNames.emptyEventTitleError);
			return;
		}
		eventName = eventName[0].toUpperCase() + eventName.substr(1);		
		return (!date) ? null :
				{ year: date.getFullYear(),
				  month: date.getMonth(),
				  day: date.getDate(),
				  title: eventName }		
	},
	
	_parseDate: function(rawDate, errorContainer) {
		rawDate = $.trim(rawDate);
		var day = parseInt(rawDate);
		if (!day || day > 31 || day < 1)
		{
			errorContainer.text(this.localNames.invalidDateError);
			return;
		}		
		var monthStart = rawDate.indexOf('.');
		monthStart = monthStart < 0 ? rawDate.indexOf(' ') : monthStart;
		if (monthStart < 0)		
		{
			errorContainer.text(this.localNames.invalidDateError);
			return;
		}
		rawDate = $.trim(rawDate.substr(++monthStart));
		var month = this._parseMonth(rawDate);
		if (!month)
		{
			errorContainer.text(this.localNames.invalidDateError);
			return;
		}
		
		var yearStart = rawDate.indexOf('.');
		yearStart = yearStart < 0 ? rawDate.indexOf(' ') : yearStart;
		var year = (yearStart > 1) ? parseInt($.trim(rawDate.substr(++yearStart))) : undefined;
		year = this._parseYear(year);
		if (!year)
		{
			errorContainer.text(this.localNames.invalidDateError);
			return;
		}
		return new Date(year, month, day);
	},
	
	_parseYear: function(rawYear)
	{
		if (rawYear === undefined)
		{
			return new Date().getFullYear();
		}
		if (isNan(rawYear) || rawYear < 0)
		{
			return null;
		}
		if (rawYear < this._currCenturyMaxYear) { 
			return (rawYear + this._currCentury); 
		} 
		if (rawYear < 1000) { 
			return (rawYear + this._currCentury - 100);
		}		
		return rawYear;
	},
	
	_parseMonth: function(rawMonth)
	{
		var month = parseInt(rawMonth) - 1;
		if (!month)
		{
			var shortMonth = rawMonth.substr(0, 3).toUpperCase();
			for(var i = 0; i < this.localNames.shortMonthName.length; i++)
			{
				if (this.localNames.shortMonthName[i].toUpperCase() === shortMonth)
				{
					month = i;
					break;
				}
			}
		}
		return (!month || month < 0 || month > 11) ? null : month;
	},
	
	_msInDay: 1000 * 60 * 60 * 24,

	toString: function() {
		return "Adnap calendar for " + this._selector;
	}	
});
