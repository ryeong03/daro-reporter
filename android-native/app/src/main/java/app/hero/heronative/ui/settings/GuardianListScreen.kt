package app.hero.heronative.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.hero.heronative.data.Guardian
import app.hero.heronative.data.UserRepository
import app.hero.heronative.data.UserSession
import app.hero.heronative.data.formatPhoneDisplay
import app.hero.heronative.ui.components.HeroScreenTopBar
import app.hero.heronative.ui.theme.HeroColors

/** Figma 167:392 — 보호자 목록 (읽기 전용) */
@Composable
fun GuardianListScreen(
    session: UserSession,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val repository = remember { UserRepository(context) }
    var guardians by remember { mutableStateOf<List<Guardian>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(session.userId) {
        repository.fetchUserDetail(session.userId)
            .onSuccess { guardians = it.guardians }
            .onFailure { error = it.message ?: "불러오기 실패" }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(HeroColors.Background)
            .verticalScroll(rememberScrollState()),
    ) {
        HeroScreenTopBar(
            title = "내 보호자 목록",
            showBack = true,
            onBack = onBack,
        )

        when {
            guardians == null && error == null -> {
                Box(Modifier.fillMaxWidth().padding(48.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = HeroColors.Primary)
                }
            }
            error != null -> {
                Text(
                    text = error!!,
                    color = HeroColors.Danger,
                    modifier = Modifier.padding(24.dp),
                )
            }
            guardians!!.isEmpty() -> {
                Text(
                    text = "등록된 보호자가 없습니다.",
                    color = HeroColors.TextSecondary,
                    modifier = Modifier.padding(24.dp),
                )
            }
            else -> {
                guardians!!.forEachIndexed { index, guardian ->
                    GuardianReadOnlyCard(index = index + 1, guardian = guardian)
                    Spacer(Modifier.height(24.dp))
                }
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun GuardianReadOnlyCard(index: Int, guardian: Guardian) {
    Column(
        modifier = Modifier
            .padding(horizontal = 24.dp)
            .fillMaxWidth()
            .shadow(4.dp, RoundedCornerShape(12.dp))
            .clip(RoundedCornerShape(12.dp))
            .background(HeroColors.Surface)
            .padding(24.dp),
    ) {
        Text(
            text = "보호자 $index",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = HeroColors.TextBody,
            modifier = Modifier.padding(bottom = 12.dp),
        )
        GuardianField("이름", guardian.name)
        Spacer(Modifier.height(12.dp))
        GuardianField("전화번호", formatPhoneDisplay(guardian.phone))
        Spacer(Modifier.height(12.dp))
        GuardianField("관계", guardian.relation ?: "-")
    }
}

@Composable
private fun GuardianField(label: String, value: String) {
    Text(
        text = label,
        fontSize = 18.sp,
        fontWeight = FontWeight.Bold,
        color = HeroColors.TextBody,
        modifier = Modifier.padding(bottom = 12.dp),
    )
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(HeroColors.InputBg)
            .padding(horizontal = 16.dp),
        contentAlignment = Alignment.CenterStart,
    ) {
        Text(
            text = value,
            fontSize = 16.sp,
            color = HeroColors.TextBody,
        )
    }
}
