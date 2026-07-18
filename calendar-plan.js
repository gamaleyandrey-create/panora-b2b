(()=>{
let shownMonth=new Date();shownMonth.setDate(1);
const navigation=document.querySelector('.plan-navigation');navigation.hidden=true;
navigation.insertAdjacentHTML('beforebegin',`<section class="bake-calendar" id="bakeCalendar"><header><button id="calendarPrev">← Предыдущий месяц</button><h3 id="calendarTitle"></h3><button id="calendarToday">Сегодня</button><button id="calendarNext">Следующий месяц →</button></header><div class="calendar-weekdays" id="calendarWeekdays"></div><div class="calendar-grid" id="calendarGrid"></div><p class="calendar-help">Нажмите на пустую дату, чтобы запланировать выпечку.</p></section>`);
const locales={ru:'ru-RU',en:'en-GB',es:'es-ES'};
function language(){return document.querySelector('#adminLanguage').value}
function monthTitle(){return new Intl.DateTimeFormat(locales[language()],{month:'long',year:'numeric'}).format(shownMonth)}
function renderBakeCalendar(){
 const l=language(),weekdays=l==='ru'?['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье']:l==='es'?['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
 document.querySelector('#calendarTitle').textContent=monthTitle();document.querySelector('#calendarWeekdays').innerHTML=weekdays.map((x,index)=>`<b class="${index>4?'weekend':''}">${x}</b>`).join('');
 const year=shownMonth.getFullYear(),month=shownMonth.getMonth(),first=new Date(year,month,1),offset=(first.getDay()+6)%7,days=new Date(year,month+1,0).getDate(),today=iso(new Date()),cells=[];
 for(let i=0;i<offset;i++)cells.push('<div class="calendar-empty"></div>');
 for(let day=1;day<=days;day++){const d=new Date(year,month,day),date=iso(d),weekdayLabel=new Intl.DateTimeFormat(locales[l],{weekday:'long'}).format(d),dateLabel=new Intl.DateTimeFormat(locales[l],{day:'numeric',month:'long'}).format(d),dayLabel=`${weekdayLabel}, ${dateLabel}`,entries=plans.filter(p=>p.bakeDate===date),details=entries.map(p=>`<span><strong>${productName(p.product)}</strong><i>${p.planned} шт. · ${p.ordered||0} заказано</i></span>`).join('');cells.push(`<button class="calendar-day ${date===today?'today':''} ${entries.length?'has-bake':''} ${[0,6].includes(d.getDay())?'weekend':''}" data-calendar-date="${date}" aria-label="${entries.length?'Открыть выпечку':'Запланировать выпечку'} ${dayLabel}"><em><span class="weekday-name">${weekdayLabel}</span><span class="date-name">${dateLabel}</span></em>${details}</button>`)}
 document.querySelector('#calendarGrid').innerHTML=cells.join('');document.querySelectorAll('[data-calendar-date]').forEach(b=>b.onclick=()=>{const date=b.dataset.calendarDate;weekStart=startOfWeek(new Date(`${date}T12:00:00`));renderPlan();document.querySelector('#addPlan').click();const f=document.querySelector('#planForm');f.bakeDate.value=date;setDefaultPlanDates(f,date)})
}
document.querySelector('#calendarPrev').onclick=()=>{shownMonth.setMonth(shownMonth.getMonth()-1);renderBakeCalendar()};document.querySelector('#calendarNext').onclick=()=>{shownMonth.setMonth(shownMonth.getMonth()+1);renderBakeCalendar()};document.querySelector('#calendarToday').onclick=()=>{shownMonth=new Date();shownMonth.setDate(1);renderBakeCalendar()};document.querySelector('#adminLanguage').addEventListener('change',renderBakeCalendar);
const baseRenderAll=renderAll;renderAll=function(){baseRenderAll();renderBakeCalendar()};renderBakeCalendar();
})();
