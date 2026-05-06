package ru.message2

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                val enabled = remember { mutableStateOf(true) }
                Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
                    Text(text = "Послание2")
                    Text(text = "E2EE: ${enabled.value}")
                    Button(onClick = { enabled.value = !enabled.value }) {
                        Text("Toggle secure mode")
                    }
                }
            }
        }
    }
}
