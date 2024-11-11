//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const timetableIds = {
  '2957': {
    'useFilter': true,
    'eventColor': CalendarApp.EventColor.BLUE,
    'regex': ".*(экзамен|пересдача|комиссия).*"
  },
  '2690': {
    'useFilter': true,
    'eventColor': CalendarApp.EventColor.ORANGE,
    'regex': ".*(экзамен|пересдача|комиссия).*"
  },
}

const calendarIdentificator = '******************************************';

// При первом копировании ВЫПОЛНИТЕ функцию init() для создания триггера с частотой выгрузки каждые 6 часов
// Если Вы хотите увидеть результат сразу же, а не ждать первое срабатывание триггера, можете выполнить функцию UpdateCalendar() в GoogleCalendar.gs
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

var handlerFunctionName = getHandlerFunctionName();

function init() {
  var triggerExist = ScriptApp.getProjectTriggers().map(trigger => trigger.getHandlerFunction()).some(item => item === handlerFunctionName);  
  if (triggerExist) {
    return;
  }
  createTimeTrigger();
}
