package app.hero.heronative.ui.onboarding

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.foundation.clickable
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.health.connect.client.PermissionController
import app.hero.heronative.data.Guardian
import app.hero.heronative.health.HealthConnectManager
import app.hero.heronative.monitoring.MonitoringScheduler
import app.hero.heronative.ui.components.HeroPrimaryButton
import app.hero.heronative.ui.components.HeroSecondaryButton
import app.hero.heronative.ui.theme.HeroColors
import app.hero.heronative.viewmodel.UserViewModel
import kotlinx.coroutines.launch

@Composable
fun OnboardingScreen(
    userViewModel: UserViewModel,
    onComplete: () -> Unit
) {
    var step by remember { mutableIntStateOf(1) }
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var gender by remember { mutableStateOf<String?>(null) }
    var birthDate by remember { mutableStateOf("") }
    val guardians = remember { mutableStateListOf(Guardian("", "", "")) }
    var loading by remember { mutableStateOf(false) }
    val snack = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val ctx = androidx.compose.ui.platform.LocalContext.current
    val healthManager = remember { HealthConnectManager(ctx.applicationContext) }

    val hcPermissionLauncher = rememberLauncherForActivityResult(
        contract = PermissionController.createRequestPermissionResultContract()
    ) { granted ->
        if (!granted.containsAll(healthManager.permissions)) {
            scope.launch { snack.showSnackbar("Health Connect 권한을 허용해주세요") }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(HeroColors.Background)
            .padding(horizontal = 24.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(56.dp))
        Text("Hero", fontSize = 36.sp, fontWeight = FontWeight.ExtraBold, color = HeroColors.Primary)
        Text("농업인 안전 모니터링", fontSize = 16.sp, color = HeroColors.TextSecondary)
        Spacer(modifier = Modifier.height(32.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            (1..3).forEach { s ->
                Spacer(
                    modifier = Modifier
                        .width(32.dp)
                        .height(4.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(if (step >= s) HeroColors.Primary else HeroColors.Border)
                )
            }
        }
        Spacer(modifier = Modifier.height(24.dp))

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(20.dp))
                .background(HeroColors.Surface)
                .padding(24.dp)
        ) {
            when (step) {
                1 -> StepBasicInfo(
                    name, { name = it }, phone, { phone = it },
                    gender, { gender = it }, birthDate, { birthDate = it },
                    onNext = { if (name.isBlank() || phone.isBlank()) {
                        scope.launch { snack.showSnackbar("이름과 전화번호는 필수입니다") }
                    } else step = 2 }
                )
                2 -> StepGuardians(
                    guardians,
                    onAdd = { guardians.add(Guardian("", "", "")) },
                    onRemove = { i -> if (guardians.size > 1) guardians.removeAt(i) },
                    onUpdate = { i, g -> guardians[i] = g },
                    onBack = { step = 1 },
                    onNext = { step = 3 }
                )
                3 -> StepWatch(
                    loading = loading,
                    onBack = { step = 2 },
                    onStart = {
                        loading = true
                        userViewModel.register(
                            name = name,
                            phone = phone,
                            gender = gender,
                            birthDate = birthDate,
                            guardians = guardians.toList(),
                            onSuccess = {
                                loading = false
                                MonitoringScheduler.schedule(ctx.applicationContext)
                                hcPermissionLauncher.launch(healthManager.permissions)
                                onComplete()
                            },
                            onError = { msg ->
                                loading = false
                                scope.launch { snack.showSnackbar(msg) }
                            }
                        )
                    }
                )
            }
        }
        SnackbarHost(hostState = snack, modifier = Modifier.padding(top = 8.dp))
        Spacer(modifier = Modifier.height(32.dp))
    }
}

@Composable
private fun StepBasicInfo(
    name: String, onName: (String) -> Unit,
    phone: String, onPhone: (String) -> Unit,
    gender: String?, onGender: (String?) -> Unit,
    birthDate: String, onBirthDate: (String) -> Unit,
    onNext: () -> Unit
) {
    Text("기본 정보", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = HeroColors.TextPrimary)
    Text("어르신의 정보를 입력해주세요", fontSize = 14.sp, color = HeroColors.TextSecondary, modifier = Modifier.padding(bottom = 16.dp))
    HeroField("이름 *", name, onName, KeyboardType.Text)
    HeroField("전화번호 *", phone, onPhone, KeyboardType.Phone)
    Text("성별", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = HeroColors.TextSecondary, modifier = Modifier.padding(top = 8.dp))
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        GenderChip("남성", gender == "male", Modifier.weight(1f)) { onGender("male") }
        GenderChip("여성", gender == "female", Modifier.weight(1f)) { onGender("female") }
    }
    HeroField("생년월일", birthDate, onBirthDate, KeyboardType.Text, "1945-03-15")
    Spacer(Modifier.height(8.dp))
    HeroPrimaryButton("다음", onNext)
}

@Composable
private fun GenderChip(
    label: String,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .border(1.dp, if (selected) HeroColors.Primary else HeroColors.Border, RoundedCornerShape(12.dp))
            .background(if (selected) HeroColors.PrimaryLight else HeroColors.Background)
            .clickable(onClick = onClick)
            .padding(vertical = 14.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(label, color = if (selected) HeroColors.Primary else HeroColors.TextSecondary, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun StepGuardians(
    guardians: List<Guardian>,
    onAdd: () -> Unit,
    onRemove: (Int) -> Unit,
    onUpdate: (Int, Guardian) -> Unit,
    onBack: () -> Unit,
    onNext: () -> Unit
) {
    Text("보호자 등록", fontSize = 22.sp, fontWeight = FontWeight.Bold)
    Text("비상 시 연락받을 보호자를 등록해주세요", fontSize = 14.sp, color = HeroColors.TextSecondary, modifier = Modifier.padding(bottom = 12.dp))
    guardians.forEachIndexed { i, g ->
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 12.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(HeroColors.Background)
                .padding(16.dp)
        ) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("보호자 ${i + 1}", fontWeight = FontWeight.SemiBold)
                if (guardians.size > 1) {
                    TextButton(onClick = { onRemove(i) }) {
                        Text("삭제", color = HeroColors.Danger)
                    }
                }
            }
            HeroField("이름", g.name, { onUpdate(i, g.copy(name = it)) }, KeyboardType.Text)
            HeroField("전화번호", g.phone, { onUpdate(i, g.copy(phone = it)) }, KeyboardType.Phone)
            HeroField("관계", g.relation ?: "", { onUpdate(i, g.copy(relation = it)) }, KeyboardType.Text, "아들, 딸")
        }
    }
    TextButton(onClick = onAdd, modifier = Modifier.fillMaxWidth().border(1.dp, HeroColors.Primary, RoundedCornerShape(12.dp))) {
        Text("+ 보호자 추가", color = HeroColors.Primary, fontWeight = FontWeight.SemiBold)
    }
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        HeroSecondaryButton("이전", onBack, Modifier.weight(0.4f))
        HeroPrimaryButton("다음", onNext, Modifier.weight(1f))
    }
}

@Composable
private fun StepWatch(loading: Boolean, onBack: () -> Unit, onStart: () -> Unit) {
    Text("워치 연결", fontSize = 22.sp, fontWeight = FontWeight.Bold)
    Text(
        "Galaxy Fit 또는 스마트워치를 연결해주세요.\nHealth Connect 앱이 설치되어 있어야 합니다.",
        fontSize = 14.sp,
        color = HeroColors.TextSecondary,
        lineHeight = 20.sp,
        modifier = Modifier.padding(vertical = 16.dp)
    )
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(HeroColors.PrimaryLight)
            .padding(20.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("⌚", fontSize = 40.sp)
        Text(
            "설정 > Health Connect에서\nHero 앱의 심박수/걸음수 권한을 허용해주세요",
            fontSize = 14.sp,
            color = HeroColors.Primary,
            lineHeight = 22.sp
        )
    }
    Spacer(Modifier.height(8.dp))
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        HeroSecondaryButton("이전", onBack, Modifier.weight(0.4f))
        if (loading) {
            CircularProgressIndicator(modifier = Modifier.weight(1f).padding(16.dp), color = HeroColors.Primary)
        } else {
            HeroPrimaryButton("시작하기", onStart, Modifier.weight(1f))
        }
    }
}

@Composable
private fun HeroField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    keyboardType: KeyboardType,
    placeholder: String = ""
) {
    Text(label, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = HeroColors.TextSecondary, modifier = Modifier.padding(top = 8.dp, bottom = 4.dp))
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = Modifier.fillMaxWidth(),
        placeholder = { if (placeholder.isNotEmpty()) Text(placeholder) },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        shape = RoundedCornerShape(12.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = HeroColors.Primary,
            unfocusedBorderColor = HeroColors.Border
        )
    )
}
