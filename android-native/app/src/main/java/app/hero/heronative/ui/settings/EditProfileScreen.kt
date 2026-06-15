package app.hero.heronative.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import app.hero.heronative.data.UserSession
import app.hero.heronative.data.formatPhoneDisplay
import app.hero.heronative.ui.components.HeroPrimaryButton
import app.hero.heronative.ui.components.HeroScreenTopBar
import app.hero.heronative.ui.components.HeroSecondaryButton
import app.hero.heronative.ui.onboarding.HeroFormField
import app.hero.heronative.ui.theme.HeroColors
import app.hero.heronative.viewmodel.UserViewModel
import kotlinx.coroutines.launch

/** Figma 11:224 — 내 정보 수정 */
@Composable
fun EditProfileScreen(
    session: UserSession,
    userViewModel: UserViewModel,
    onBack: () -> Unit,
    onSaved: () -> Unit,
) {
    var name by remember(session.userId) { mutableStateOf(session.userName) }
    var phone by remember(session.userId) {
        mutableStateOf(formatPhoneDisplay(session.phone))
    }
    var saving by remember { mutableStateOf(false) }
    val snack = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(HeroColors.Background)
            .verticalScroll(rememberScrollState()),
    ) {
        HeroScreenTopBar(
            title = "내 정보 수정",
            showBack = true,
            onBack = onBack,
        )

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
        ) {
            HeroFormField(
                label = "이름*",
                value = name,
                onValueChange = { name = it },
                placeholder = "이름을 입력해주세요",
            )
            Spacer(Modifier.height(24.dp))
            HeroFormField(
                label = "전화번호*",
                value = phone,
                onValueChange = { phone = it },
                placeholder = "01012345678",
                keyboardType = KeyboardType.Phone,
            )
            Spacer(Modifier.height(32.dp))
            HeroPrimaryButton(
                text = if (saving) "저장 중..." else "저장하기",
                onClick = {
                    if (saving) return@HeroPrimaryButton
                    saving = true
                    userViewModel.updateProfile(
                        userId = session.userId,
                        name = name,
                        phone = phone,
                        onSuccess = {
                            saving = false
                            onSaved()
                        },
                        onError = { message ->
                            saving = false
                            scope.launch { snack.showSnackbar(message) }
                        },
                    )
                },
                enabled = !saving,
            )
            Spacer(Modifier.height(8.dp))
            HeroSecondaryButton(
                text = "취소",
                onClick = onBack,
            )
        }

        SnackbarHost(
            hostState = snack,
            modifier = Modifier.padding(24.dp),
        )
    }
}
