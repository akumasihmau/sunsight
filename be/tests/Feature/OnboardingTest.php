<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OnboardingTest extends TestCase
{
    use RefreshDatabase;

    public function test_onboarding_menolak_permintaan_tanpa_token(): void
    {
        $this->postJson('/api/onboarding/complete')->assertStatus(401);
    }

    public function test_onboarding_user_baru_mengisi_waktu_selesai(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => null]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/onboarding/complete')
            ->assertOk();

        $this->assertNotNull($response->json('onboarding_completed_at'));
        $this->assertNotNull($user->refresh()->onboarding_completed_at);
    }

    public function test_onboarding_kedua_kali_tidak_menggeser_waktu_pertama(): void
    {
        $user = User::factory()->create(['onboarding_completed_at' => null]);

        $pertama = $this->actingAs($user, 'sanctum')
            ->postJson('/api/onboarding/complete')
            ->assertOk()
            ->json('onboarding_completed_at');

        $this->travel(5)->minutes();

        $kedua = $this->actingAs($user, 'sanctum')
            ->postJson('/api/onboarding/complete')
            ->assertOk()
            ->json('onboarding_completed_at');

        $this->assertSame(
            $pertama,
            $kedua,
            'Onboarding bersifat idempoten; waktu yang sudah tercatat tidak boleh bergeser.',
        );
    }

    public function test_profil_memuat_penanda_onboarding_dan_avatar(): void
    {
        $user = User::factory()->create([
            'onboarding_completed_at' => null,
            'avatar_url' => null,
        ]);

        $profil = $this->actingAs($user, 'sanctum')
            ->getJson('/api/user')
            ->assertOk()
            ->json();

        $this->assertArrayHasKey('onboarding_completed_at', $profil);
        $this->assertArrayHasKey('avatar_url', $profil);
        $this->assertNull($profil['onboarding_completed_at']);
        $this->assertNull($profil['avatar_url']);
    }

    public function test_profil_tidak_membocorkan_google_id(): void
    {
        $user = User::factory()->create(['google_id' => '1234567890']);

        $profil = $this->actingAs($user, 'sanctum')->getJson('/api/user')->assertOk()->json();

        $this->assertArrayNotHasKey('google_id', $profil);
    }
}
