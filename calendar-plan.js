(()=>{
let shownMonth=new Date();shownMonth.setDate(1);setTimeout(()=>{shownMonth=currentMadridMonth?.()||shownMonth;renderBakeCalendar?.()},0);
const navigation=document.querySelector('.plan-navigation');navigation.hidden=true;
navigation.insertAdjacentHTML('beforebegin',`<section class="bake-calendar" id="bakeCalendar" data-calendar-mode="active"><div class="bake-calendar-modebar"><div class="bake-calendar-tabs" role="tablist" aria-label="Дни выпечки"><button type="button" id="calendarActiveMode" class="active" aria-pressed="true">Сегодня / Будущие</button><button type="button" id="calendarHistoryMode" aria-pressed="false">Прошедшие</button></div><span id="calendarModeHint">Рабочий календарь · прошлые даты скрыты</span></div><header><button id="calendarPrev">← Предыдущий месяц</button><h3 id="calendarTitle"></h3><button id="calendarToday">Сегодня</button><button id="calendarNext">Следующий месяц →</button></header><div class="calendar-weekdays" id="calendarWeekdays"></div><div class="calendar-grid" id="calendarGrid"></div><p class="calendar-help" id="calendarHelp">Нажмите на пустую будущую дату, чтобы запланировать выпечку.</p></section>`);
const calendarHeading=document.querySelector('#view-plan .page-head');
const calendarBlock=document.querySelector('#bakeCalendar');
if(calendarHeading&&calendarBlock)calendarBlock.insertAdjacentElement('beforebegin',calendarHeading);
const mobileLayout=window.matchMedia('(max-width:850px)');
function placeBakeCalendar(){
 const calendar=document.querySelector('#bakeCalendar'),view=document.querySelector('#view-plan');
 if(!calendar||!calendarHeading||!view)return;
 // Panora 7.26: on mobile the calendar used to be moved after #planList. That list is
 // intentionally hidden by calendar-calm.css and the completion board can be long,
 // so the real calendar ended up far below the visible mobile viewport and looked absent.
 // Keep the calendar directly under the page heading on mobile; desktop placement stays unchanged.
 if(mobileLayout.matches){
   view.insertAdjacentElement('afterbegin',calendarHeading);
   calendarHeading.insertAdjacentElement('afterend',calendar);
 }else{
   navigation.insertAdjacentElement('beforebegin',calendarHeading);
   calendarHeading.insertAdjacentElement('afterend',calendar);
 }
}
placeBakeCalendar();
if(typeof mobileLayout.addEventListener==='function')mobileLayout.addEventListener('change',placeBakeCalendar);
else mobileLayout.addListener(placeBakeCalendar);
const locales={ru:'ru-RU',en:'en-GB',es:'es-ES'};
let calendarMode='active';
function madridToday(){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const value=Object.fromEntries(parts.filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
 return `${value.year}-${value.month}-${value.day}`;
}
function monthIso(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`}
function currentMadridMonth(){
 const today=madridToday();
 return new Date(`${today.slice(0,7)}-01T12:00:00`);
}
function setCalendarMode(mode){
 calendarMode=mode==='history'?'history':'active';
 window.panoraBakeCalendarHistoryMode=calendarMode==='history';
 const active=document.querySelector('#calendarActiveMode'),history=document.querySelector('#calendarHistoryMode'),calendar=document.querySelector('#bakeCalendar');
 if(active){active.classList.toggle('active',calendarMode==='active');active.setAttribute('aria-pressed',calendarMode==='active'?'true':'false')}
 if(history){history.classList.toggle('active',calendarMode==='history');history.setAttribute('aria-pressed',calendarMode==='history'?'true':'false')}
 if(calendar)calendar.dataset.calendarMode=calendarMode;
 if(calendarMode==='active'){
   const current=currentMadridMonth();
   if(monthIso(shownMonth)<monthIso(current))shownMonth=current;
 }else{
   const today=madridToday();
   if(monthIso(shownMonth)>today.slice(0,7)){
     const previous=currentMadridMonth();previous.setMonth(previous.getMonth()-1);shownMonth=previous;
   }
 }
 renderPlan?.();
 renderBakeCalendar();
}
function language(){return document.querySelector('#adminLanguage').value}
function monthTitle(){return new Intl.DateTimeFormat(locales[language()],{month:'long',year:'numeric'}).format(shownMonth)}
function renderBakeCalendar(){
 const l=language(),weekdays=l==='ru'?['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье']:l==='es'?['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
 const today=madridToday(),currentMonth=today.slice(0,7),shownPrefix=monthIso(shownMonth),history=calendarMode==='history';
 const prevButton=document.querySelector('#calendarPrev'),todayButton=document.querySelector('#calendarToday'),modeHint=document.querySelector('#calendarModeHint'),help=document.querySelector('#calendarHelp');
 if(prevButton)prevButton.disabled=!history&&shownPrefix<=currentMonth;
 if(todayButton){todayButton.textContent=history?(l==='ru'?'Последний прошедший':l==='es'?'Último pasado':'Latest past'):(l==='ru'?'Сегодня':l==='es'?'Hoy':'Today')}
 if(modeHint)modeHint.textContent=history
   ?(l==='ru'?'История · только просмотр':l==='es'?'Historial · solo lectura':'History · read only')
   :(l==='ru'?'Рабочий календарь · прошлые даты скрыты':l==='es'?'Calendario de trabajo · fechas pasadas ocultas':'Working calendar · past dates hidden');
 if(help)help.textContent=history
   ?(l==='ru'?'Прошедшие дни сохранены для истории. Изменять расписание здесь нельзя.':l==='es'?'Los días pasados se conservan para el historial. No se pueden editar aquí.':'Past bake days are kept for history. Schedule editing is disabled here.')
   :(l==='ru'?'Нажмите на пустую будущую дату, чтобы запланировать выпечку.':l==='es'?'Pulsa una fecha futura vacía para programar una hornada.':'Select an empty future date to schedule a bake.');
 document.querySelector('#calendarTitle').textContent=monthTitle();
 document.querySelector('#calendarWeekdays').innerHTML=weekdays.map((x,index)=>`<b class="${index>4?'weekend':''}">${x}</b>`).join('');
 const year=shownMonth.getFullYear(),month=shownMonth.getMonth(),days=new Date(year,month+1,0).getDate(),cells=[];
 // Panora 7.34: in the working view of the current month, do not keep invisible
 // past weeks in the CSS grid. Start the grid at the current week while preserving
 // Monday-Sunday alignment. This removes the large empty block above today's dates.
 const currentWorkingMonth=!history&&shownPrefix===currentMonth;
 const firstDay=currentWorkingMonth?Number(today.slice(8,10)):1;
 const firstVisible=new Date(year,month,firstDay);
 const offset=(firstVisible.getDay()+6)%7;
 for(let i=0;i<offset;i++)cells.push('<div class="calendar-empty calendar-leading"></div>');
 for(let day=firstDay;day<=days;day++){
   const d=new Date(year,month,day),date=iso(d),isPast=date<today,isVisible=history?isPast:!isPast;
   if(!isVisible){cells.push('<div class="calendar-empty calendar-filtered"></div>');continue}
   const weekdayLabel=new Intl.DateTimeFormat(locales[l],{weekday:'long'}).format(d),dateLabel=new Intl.DateTimeFormat(locales[l],{day:'numeric',month:'long'}).format(d),dayLabel=`${weekdayLabel}, ${dateLabel}`,entries=plans.filter(p=>p.bakeDate===date),details=entries.map(p=>`<span><strong>${productName(p.product)}</strong><i>${p.planned} шт. · ${p.ordered||0} заказано</i></span>`).join('');
   const readonly=history?'history-readonly':'';
   const badge=history?`<small class="calendar-history-badge">${l==='ru'?'Только просмотр':l==='es'?'Solo lectura':'Read only'}</small>`:'';
   const disabled=history?' disabled':'';
   const aria=history?(l==='ru'?'Прошедшая выпечка':l==='es'?'Horneado pasado':'Past bake'):(entries.length?(l==='ru'?'Открыть выпечку':l==='es'?'Abrir horneado':'Open bake'):(l==='ru'?'Запланировать выпечку':l==='es'?'Programar horneado':'Schedule bake'));
   cells.push(`<button class="calendar-day ${date===today?'today':''} ${entries.length?'has-bake':''} ${[0,6].includes(d.getDay())?'weekend':''} ${readonly}" data-calendar-date="${date}" aria-label="${aria} ${dayLabel}"${disabled}><em><span class="weekday-name">${weekdayLabel}</span><span class="date-name">${dateLabel}</span></em>${badge}${details}</button>`);
 }
 document.querySelector('#calendarGrid').innerHTML=cells.join('');
 const monthPlans=plans.filter(p=>p.bakeDate.startsWith(shownPrefix)&&(history?p.bakeDate<today:p.bakeDate>=today)),planned=monthPlans.reduce((sum,p)=>sum+Number(p.planned||0),0),ordered=monthPlans.reduce((sum,p)=>sum+Number(p.ordered||0),0);
 document.querySelector('#plannedPieces').textContent=`${planned} ${t('pcs')}`;document.querySelector('#orderedPieces').textContent=`${ordered} ${t('pcs')}`;document.querySelector('#freePieces').textContent=`${Math.max(0,planned-ordered)} ${t('pcs')}`;
 if(!history){
   document.querySelectorAll('[data-calendar-date]:not([disabled])').forEach(b=>b.onclick=()=>{const date=b.dataset.calendarDate,entries=plans.filter(p=>p.bakeDate===date);weekStart=startOfWeek(new Date(`${date}T12:00:00`));renderPlan();document.querySelector('#addPlan').click();const f=document.querySelector('#planForm'),cancel=document.querySelector('#cancelSelectedBake');f.bakeDate.value=date;setDefaultPlanDates(f,date);entries.forEach(entry=>{const input=f.querySelector(`[data-plan-product="${entry.product}"]`);if(input)input.value=entry.planned;f.deliveryDate.value=entry.deliveryDate||date;if(entry.cutoff)f.cutoff.value=String(entry.cutoff).slice(0,16);f.open.checked=entry.open!==false});cancel.hidden=!entries.length;cancel.dataset.date=date;f.querySelector('h3').textContent=entries.length?'Изменить день выпечки':'Запланировать выпечку'})
 }
}
document.querySelector('#calendarPrev').onclick=()=>{const next=new Date(shownMonth);next.setMonth(next.getMonth()-1);if(calendarMode==='active'&&monthIso(next)<madridToday().slice(0,7))return;shownMonth=next;renderBakeCalendar()};document.querySelector('#calendarNext').onclick=()=>{shownMonth.setMonth(shownMonth.getMonth()+1);renderBakeCalendar()};document.querySelector('#calendarToday').onclick=()=>{if(calendarMode==='history'){const d=currentMadridMonth();d.setMonth(d.getMonth()-1);shownMonth=d}else shownMonth=currentMadridMonth();renderBakeCalendar()};document.querySelector('#calendarActiveMode').onclick=()=>setCalendarMode('active');document.querySelector('#calendarHistoryMode').onclick=()=>setCalendarMode('history');document.querySelector('#adminLanguage').addEventListener('change',renderBakeCalendar);
document.querySelector('#cancelSelectedBake').onclick=event=>{const date=event.currentTarget.dataset.date;document.querySelector('#planDialog').close();document.querySelector('#cancelBakeDay').click();document.querySelector('#cancelBakeDate').value=date;renderCancelBakeSummary()};
const baseRenderAll=renderAll;renderAll=function(){baseRenderAll();renderBakeCalendar()};renderBakeCalendar();
})();
