var VERSION = 1.0;

function getHandlerFunctionName() {
  return "UpdateCalendar";
}

function createTimeTrigger() {
  ScriptApp.newTrigger(getHandlerFunctionName())
        .timeBased()
        .everyHours(6)
        .create();
}

function handler(requests) {
  // if limit > 2 then rateLimitExceeded
  const limit = 2;
  const numberForDelete = Math.ceil(requests.length / limit);

  var delay = 200

  for (let k = 0; k < numberForDelete + 1; k++) {
    const bound = Math.min(requests.length, (k + 1) * limit);
    const slice = requests.slice(k * limit, bound);
    try {
     var res = UrlFetchApp.fetchAll(slice);
    } 
    catch(e) {
      if (delay <= 1000 * 8) {
        Utilities.sleep(delay);
        delay *= 2
        k -= 1
      }
      else {
        var res = UrlFetchApp.fetchAll(slice);
      }
    }
  }
}

function getCurrentVersion() {
  return VERSION;
}

function UpdateCalendar() {
  
  var now = new Date();

  // Получаем дату 30+ дней
  var rightDate = new Date(now);
  rightDate.setDate(rightDate.getDate() + 30);
  rightDateStr = rightDate.toISOString().slice(0, 10);

  // Получаем дату -1 день
  var leftDate = new Date(now);
  leftDate.setDate(leftDate.getDate() - 1);
  leftDate.setUTCHours(0,0,0,0);
  leftDateStr = leftDate.toISOString().slice(0, 10);

  // Получаем календарь
  var calendar = CalendarApp.getCalendarById(calendarIdentificator);

  Object.entries(timetableIds).forEach(([timetableId, options]) => {
    try {// НЕ менять это значение
      var res = UrlFetchApp.fetch(`https://timetable.spbu.ru/api/v1/educators/${timetableId}/events/${leftDateStr}/${rightDateStr}`);
      var dct = JSON.parse(res);
    }
    catch (e) {
      Logger.log("Ошибка Timetable, расписание для " + timetableId + " остается прежним " + e);
      return;
    }

    var events_days = dct['EducatorEventsDays'];
    var educatorName = dct['EducatorDisplayText'];
    var postRequests = [];

    events_days.forEach(event => {
      var day_study_events = event['DayStudyEvents'];
      day_study_events.forEach(day_event => {
        var start = day_event['Start'];
        var startDate = new Date(start);
        var end = day_event['End'];
        var endDate = new Date(end);
        var subject = day_event['Subject'];
        var location = day_event['LocationsDisplayText'];
        var groups_or_educator_names = educatorName + '\n' +day_event['ContingentUnitName']
        var is_cancelled = day_event['IsCancelled'];
        var is_assigned = day_study_events['IsAssigned'];
        var time_was_changed = day_study_events['TimeWasChanged'];
        if (groups_or_educator_names == "Нет"){
          is_cancelled = true;
        }
        if (is_cancelled){
          return;
        }

        if (options['useFilter']) {
          if (!subject.match(options['regex'])) {
              return;
          }
        }

        var formData = {
        "summary": subject,
        "description": groups_or_educator_names,
        "location": location,
        "start": {
        "dateTime": startDate,
        },
        "end": {
          "dateTime": endDate,
        },
        "colorId": options['eventColor'],
        "extendedProperties": {
        "private": {
        "id": timetableId
        }}};

        var paramsForPost = {
        url: `https://www.googleapis.com/calendar/v3/calendars/${calendarIdentificator}/events`,
        headers: {Authorization: "Bearer " + ScriptApp.getOAuthToken()}, 
        muteHttpExceptions: true,
        method:"POST",
        payload: JSON.stringify(formData)};

        postRequests.push(paramsForPost);
      })
    })

    try {
      // Получаем события за последний месяц
      var requests = Calendar.Events.list(calendar.getId(),{'privateExtendedProperty':                                                   
                                                       ['id='+timetableId,],
                                                       'timeMin': leftDate.toISOString(),
                                                       'timeMax': rightDate.toISOString(),
                                                   }).items.map(event => (
        {url: `https://www.googleapis.com/calendar/v3/calendars/${calendarIdentificator}/events/${event.getId().replace("@google.com", "")}`,
        headers: {Authorization: "Bearer " + ScriptApp.getOAuthToken()}, 
        method: "DELETE"}));
    }
    catch(e) {
      Logger.log("Ошибка, не удалось удалить события, расписание для " + timetableId + " остается прежним " + e);
      return;
    }

    try {
      handler(postRequests);
    }
    catch(e) {
      Logger.log("Не получилось добавить новые события " + e);
      return;
    }

    Logger.log('Новые события успешно добавлены');
    Logger.log(`Количество событий для удаления: ${requests.length}`);

    try {
      handler(requests);
    }
    catch(e) {
      Logger.log("Не удалось удалить нужные события " + e);
      return;
    }

    Logger.log('События успешно удалены');
  })
}
