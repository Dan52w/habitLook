package com.habitlook

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = TodayWidgetModule.NAME)
class TodayWidgetModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  companion object { const val NAME = "TodayWidget" }
  override fun getName() = NAME
  @ReactMethod fun update(data: ReadableMap) {
    val prefs = reactApplicationContext.getSharedPreferences("today_widget", 0).edit()
    prefs.putString("activity", data.getString("activity") ?: "Sin actividad próxima")
    prefs.putString("time", data.getString("time") ?: "Planifica tu día en HabitLook")
    prefs.apply()
    val context = reactApplicationContext
    val manager = AppWidgetManager.getInstance(context)
    val component = ComponentName(context, TodayWidgetProvider::class.java)
    TodayWidgetProvider().onUpdate(context, manager, manager.getAppWidgetIds(component))
  }
}
