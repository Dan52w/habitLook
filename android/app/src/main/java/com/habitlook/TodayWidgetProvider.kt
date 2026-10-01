package com.habitlook

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.app.PendingIntent
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class TodayWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    val prefs = context.getSharedPreferences("today_widget", Context.MODE_PRIVATE)
    val activity = prefs.getString("activity", "Sin actividad próxima") ?: "Sin actividad próxima"
    val time = prefs.getString("time", "Planifica tu día en HabitLook") ?: "Planifica tu día en HabitLook"
    val clock = SimpleDateFormat("HH:mm", Locale("es", "CO")).format(Date())
    ids.forEach { id ->
      val views = RemoteViews(context.packageName, R.layout.today_widget)
      views.setTextViewText(R.id.widget_time, clock)
      views.setTextViewText(R.id.widget_activity, activity)
      views.setTextViewText(R.id.widget_detail, time)
      val intent = Intent(context, MainActivity::class.java)
      val pending = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
      views.setOnClickPendingIntent(R.id.widget_root, pending)
      manager.updateAppWidget(id, views)
    }
  }
}
